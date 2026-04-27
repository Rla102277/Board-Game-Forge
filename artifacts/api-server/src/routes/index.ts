import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import entitiesRouter from "./entities";
import rulesRouter from "./rules";
import playersRouter from "./players";
import notesRouter from "./notes";
import tasksRouter from "./tasks";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(entitiesRouter);
router.use(rulesRouter);
router.use(playersRouter);
router.use(notesRouter);
router.use(tasksRouter);
router.use(chatRouter);

export default router;
