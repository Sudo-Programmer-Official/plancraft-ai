import Foundation
import Capacitor
import StoreKit

private enum ApplePurchasesError: LocalizedError {
    case missingProductId
    case missingProductIds
    case productNotFound(String)
    case transactionVerificationFailed
    case unsupportedPlatform

    var errorDescription: String? {
        switch self {
        case .missingProductId:
            return "Missing Apple product ID."
        case .missingProductIds:
            return "Missing Apple product IDs."
        case .productNotFound(let productId):
            return "Apple product not found: \(productId)."
        case .transactionVerificationFailed:
            return "Apple transaction verification failed."
        case .unsupportedPlatform:
            return "Apple in-app purchases require iOS 15 or newer."
        }
    }
}

@objc(ApplePurchasesPlugin)
class ApplePurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ApplePurchasesPlugin"
    public let jsName = "ApplePurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject(ApplePurchasesError.unsupportedPlatform.localizedDescription, "unsupported_platform")
            return
        }

        let productIds = self.productIds(from: call)
        guard !productIds.isEmpty else {
            call.reject(ApplePurchasesError.missingProductIds.localizedDescription, "missing_product_ids")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIds)
                call.resolve([
                    "products": products.map { self.serializeProduct($0) },
                ])
            } catch {
                call.reject("Failed to fetch Apple products.", "product_fetch_failed", error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject(ApplePurchasesError.unsupportedPlatform.localizedDescription, "unsupported_platform")
            return
        }

        guard let productId = self.productId(from: call) else {
            call.reject(ApplePurchasesError.missingProductId.localizedDescription, "missing_product_id")
            return
        }

        Task {
            do {
                let product = try await self.fetchProduct(productId: productId)
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try self.verifiedTransaction(from: verification)
                    let statusContext = try await self.resolveStatusContext(for: product, transaction: transaction)
                    let payload = self.serializeTransaction(transaction, statusContext: statusContext)
                    await transaction.finish()
                    call.resolve(["transaction": payload])
                case .userCancelled:
                    call.reject("Purchase cancelled.", "purchase_cancelled")
                case .pending:
                    call.reject("Purchase pending approval.", "purchase_pending")
                @unknown default:
                    call.reject("Unknown Apple purchase state.", "purchase_unknown")
                }
            } catch {
                call.reject("Failed to complete Apple purchase.", "purchase_failed", error)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject(ApplePurchasesError.unsupportedPlatform.localizedDescription, "unsupported_platform")
            return
        }

        let requestedProductIds = Set(self.productIds(from: call))

        Task {
            do {
                try await AppStore.sync()

                let products = requestedProductIds.isEmpty
                    ? []
                    : try await Product.products(for: Array(requestedProductIds))
                let productById = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })

                var transactions = [[String: Any]]()
                for await entitlement in Transaction.currentEntitlements {
                    do {
                        let transaction = try self.verifiedTransaction(from: entitlement)
                        if !requestedProductIds.isEmpty && !requestedProductIds.contains(transaction.productID) {
                            continue
                        }
                        let statusContext = try await self.resolveStatusContext(
                            for: productById[transaction.productID],
                            transaction: transaction
                        )
                        transactions.append(self.serializeTransaction(transaction, statusContext: statusContext))
                    } catch {
                        continue
                    }
                }

                transactions.sort { left, right in
                    let leftDate = self.sortDate(from: left)
                    let rightDate = self.sortDate(from: right)
                    return leftDate > rightDate
                }

                call.resolve([
                    "transactions": transactions,
                    "count": transactions.count,
                ])
            } catch {
                call.reject("Failed to restore Apple purchases.", "restore_failed", error)
            }
        }
    }
}

@available(iOS 15.0, *)
private extension ApplePurchasesPlugin {
    func productId(from call: CAPPluginCall) -> String? {
        if let value = call.options["productId"] as? String {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        return nil
    }

    func productIds(from call: CAPPluginCall) -> [String] {
        if let values = call.options["productIds"] as? [String] {
            return values
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
        }
        if let productId = productId(from: call) {
            return [productId]
        }
        return []
    }

    func fetchProduct(productId: String) async throws -> Product {
        let products = try await Product.products(for: [productId])
        guard let product = products.first(where: { $0.id == productId }) else {
            throw ApplePurchasesError.productNotFound(productId)
        }
        return product
    }

    func verifiedTransaction(from result: VerificationResult<Transaction>) throws -> Transaction {
        switch result {
        case .verified(let transaction):
            return transaction
        case .unverified(_, _):
            throw ApplePurchasesError.transactionVerificationFailed
        }
    }

    func serializeProduct(_ product: Product) -> [String: Any] {
        [
            "productId": product.id,
            "title": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "type": String(describing: product.type).lowercased(),
        ]
    }

    func resolveStatusContext(for product: Product?, transaction: Transaction) async throws -> [String: String] {
        let fallback = inferTransactionStatus(transaction)
        guard let subscription = product?.subscription else { return fallback }

        let statuses = try await subscription.status
        for status in statuses {
            let verified = try? verifiedTransaction(from: status.transaction)
            guard let statusTransaction = verified else { continue }
            guard statusTransaction.productID == transaction.productID else { continue }

            let sameTransaction =
                statusTransaction.id == transaction.id ||
                statusTransaction.originalID == transaction.originalID
            guard sameTransaction else { continue }

            let rawState = String(describing: status.state).lowercased()
            var normalized = fallback["status"] ?? "active"
            if rawState.contains("grace") || rawState.contains("retry") {
                normalized = "in_grace_period"
            } else if rawState.contains("subscribed") {
                normalized = "active"
            } else if rawState.contains("expired") {
                normalized = "expired"
            } else if rawState.contains("revoked") {
                normalized = "cancelled"
            }
            return [
                "status": normalized,
                "rawStatus": rawState,
            ]
        }

        return fallback
    }

    func inferTransactionStatus(_ transaction: Transaction) -> [String: String] {
        if transaction.revocationDate != nil {
            return [
                "status": "cancelled",
                "rawStatus": "revoked",
            ]
        }

        if let expirationDate = transaction.expirationDate {
            if expirationDate.timeIntervalSinceNow > 0 {
                return [
                    "status": "active",
                    "rawStatus": "active",
                ]
            }
            return [
                "status": "expired",
                "rawStatus": "expired",
            ]
        }

        return [
            "status": "active",
            "rawStatus": "active",
        ]
    }

    func serializeTransaction(_ transaction: Transaction, statusContext: [String: String]) -> [String: Any] {
        var payload: [String: Any] = [
            "productId": transaction.productID,
            "status": statusContext["status"] ?? "active",
            "rawStatus": statusContext["rawStatus"] ?? "active",
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "purchaseDate": transaction.purchaseDate,
            "ownershipType": String(describing: transaction.ownershipType).lowercased(),
        ]

        if let expirationDate = transaction.expirationDate {
            payload["expiresAt"] = expirationDate
        }

        if let revocationDate = transaction.revocationDate {
            payload["revocationDate"] = revocationDate
        }

        return payload
    }

    func sortDate(from payload: [String: Any]) -> Date {
        if let expiresAt = payload["expiresAt"] as? Date {
            return expiresAt
        }
        if let purchaseDate = payload["purchaseDate"] as? Date {
            return purchaseDate
        }
        return Date.distantPast
    }
}
