// Placeholder: in a real app, fetch from Firestore/CRM.
const mockContacts = [
  { contactId: 'c1', name: 'Aarav', phoneNumber: '+15550001', tags: ['family'] },
  { contactId: 'c2', name: 'Priya', phoneNumber: '+15550002', tags: ['party'] },
  { contactId: 'c3', name: 'Rohit', phoneNumber: '+15550003', tags: ['booth'] },
]
const mockGroups = [
  { groupId: 'g1', name: 'Family', members: ['c1'], tags: ['family'] },
  { groupId: 'g2', name: 'Party Workers', members: ['c2'], tags: ['party'] },
  { groupId: 'g3', name: 'Booth Workers', members: ['c3'], tags: ['booth'] },
]

export async function listContacts(_req, res, next) {
  try {
    res.json({ contacts: mockContacts })
  } catch (err) {
    next(err)
  }
}

export async function listGroups(_req, res, next) {
  try {
    res.json({ groups: mockGroups.map(({ members, ...rest }) => rest) })
  } catch (err) {
    next(err)
  }
}

export async function resolveGroups(req, res, next) {
  try {
    const groupIds = req.query.groupIds || []
    const ids = Array.isArray(groupIds) ? groupIds : [groupIds]
    const selected = mockGroups.filter((g) => ids.includes(g.groupId))
    const contacts = mockContacts.filter((c) => selected.some((g) => g.members.includes(c.contactId)))
    res.json(contacts)
  } catch (err) {
    next(err)
  }
}
