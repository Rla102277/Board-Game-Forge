import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import adminRouter from "./admin";
import projectsRouter from "./projects";
import entitiesRouter from "./entities";
import propertiesRouter from "./properties";
import rulesRouter from "./rules";
import playersRouter from "./players";
import notesRouter from "./notes";
import tasksRouter from "./tasks";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";
import researchRouter from "./research";
import assetsRouter from "./assets";
import simulatorRouter from "./simulator";
import playtestRouter from "./playtest";
import publicFeedbackRouter from "./publicFeedback";
import storyboardRouter from "./storyboard";
import balanceRouter from "./balance";
import changelogRouter from "./changelog";
import exportsRouter from "./exports";
import blueprintRouter from "./blueprint";
import kickstarterRouter from "./kickstarter";
import workspacesRouter from "./workspaces";
import learnRouter from "./learn";
import aiTextRouter from "./aiText";
import {
  requireAuth,
  requireProjectAccess,
} from "../middlewares/projectAuth";

const router: IRouter = Router();

// Public/unauthenticated routes
router.use(healthRouter);
router.use(publicFeedbackRouter);

// Authenticated routes
router.use(meRouter);
router.use(adminRouter);
router.use(dashboardRouter);

// Workspaces routes (auth required, workspace access enforced inside handlers)
router.use("/workspaces", requireAuth);
router.use(workspacesRouter);

// Topic-scoped Learn tutor (authenticated, no project context)
router.use("/learn", requireAuth);
router.use(learnRouter);

// Projects routes (auth required, project-scoped routes have ownership/membership check)
router.use("/projects", requireAuth);
router.use("/projects/:projectId", requireProjectAccess);

router.use(projectsRouter);
router.use(researchRouter);
router.use(entitiesRouter);
router.use(propertiesRouter);
router.use(rulesRouter);
router.use(playersRouter);
router.use(notesRouter);
router.use(tasksRouter);
router.use(chatRouter);
router.use(assetsRouter);
router.use(simulatorRouter);
router.use(playtestRouter);
router.use(storyboardRouter);
router.use(balanceRouter);
router.use(changelogRouter);
router.use(exportsRouter);
router.use(blueprintRouter);
router.use(kickstarterRouter);
router.use(aiTextRouter);

export default router;
