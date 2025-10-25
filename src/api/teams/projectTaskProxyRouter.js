import express from 'express';
import teamTaskRouter from './taskRouter.js';

// Provide RESTful alias: /api/orgs/:orgId/projects/:projectId/tasks
// by proxying into the existing /api/tasks router.

const router = express.Router({ mergeParams: true });

router.use((req, _res, next) => {
  const orgId = req.params.orgId;
  const projectId = req.params.projectId;

  if (orgId) {
    req.params.teamId = orgId;
    req.query.teamId = orgId;
  }
  if (projectId) {
    req.params.projectId = projectId;
    req.query.projectId = projectId;
  }

  next();
});

router.use(teamTaskRouter);

export default router;
