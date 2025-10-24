import { DATABASE_ID, IMAGES_BUCKET_ID, MEMBERS_ID, PROJECTS_ID, TASKS_ID, WORKSPACES_ID } from "@/config";
import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import z from "zod";
import { createProjectsSchema, updateProjectSchema } from "../schemas";
import { Project } from "../types";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
    .post(
        "/",
        sessionMiddleware,
        zValidator("form", createProjectsSchema),
        async (c) => {
            const databases = c.get('databases');
            const storage = c.get('storage');
            const user = c.get('user');

            const { name, image, workspaceId } = c.req.valid('form');

            const member = await getMember({
                databases,
                workspaceId,
                userId: user.$id,
            });

            if (!member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            let uploadedImageUrl: string | undefined;

            if (image instanceof File) {
                const file = await storage.createFile(
                    IMAGES_BUCKET_ID,
                    ID.unique(),
                    image
                );

                const arrayBuffer = await storage.getFileDownload(IMAGES_BUCKET_ID, file.$id);

                // Convertim în base64 și facem data URL
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                uploadedImageUrl = `data:${image.type};base64,${base64}`;
            }


            const project = await databases.createDocument(
                DATABASE_ID,
                PROJECTS_ID,
                ID.unique(),
                {
                    name,
                    imageUrl: uploadedImageUrl,
                    workspaceId,
                },

            );




            return c.json({ data: project });
        }
    )


    .get(
        "/",
        sessionMiddleware,
        zValidator("query", z.object({ workspaceId: z.string() })),
        async (c) => {
            const user = c.get("user");
            const databases = c.get("databases");

            const { workspaceId } = c.req.valid("query");

            if (!workspaceId) {
                return c.json({ error: "Missing workspaceId" }, 400);
            }

            const member = await getMember({
                databases,
                workspaceId,
                userId: user.$id,
            });

            if (!member) {
                return c.json({ message: "Member not found" }, 401);
            }

            const projects = await databases.listDocuments<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                [
                    Query.equal("workspaceId", workspaceId),
                    Query.orderDesc("$createdAt"),
                ],
            );

            console.log({ projects });

            return c.json({ data: { projects } });
        }
    )

    .get(
        "/:projectId",
        sessionMiddleware,
        async (c) => {
            const user = c.get('user');
            const databases = c.get('databases');
            const { projectId } = c.req.param();

            const project = await databases.getDocument<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                projectId,
            );

            const member = await getMember({
                databases,
                userId: user.$id,
                workspaceId: project.workspaceId,
            });

            if (!member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            return c.json({ data: project });
        }
    )


    .patch(
        "/:projectId",
        sessionMiddleware,
        zValidator("form", updateProjectSchema),
        async (c) => {
            const databases = c.get("databases");
            const storage = c.get("storage");
            const user = c.get("user");

            const { projectId } = c.req.param();
            const { name, image } = c.req.valid("form");

            const existingProject = await databases.getDocument<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                projectId
            );



            const member = await getMember(
                {
                    databases,
                    userId: user.$id,
                    workspaceId: existingProject.workspaceId
                }
            );

            if (!member) {
                return c.json({ error: "You don't have permission to update this workspace." }, 401);
            }

            let uploadedImageUrl: string | undefined;

            if (image instanceof File) {
                const file = await storage.createFile(
                    IMAGES_BUCKET_ID,
                    ID.unique(),
                    image
                );

                const arrayBuffer = await storage.getFileDownload(IMAGES_BUCKET_ID, file.$id);

                // Convertim în base64 și facem data URL
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                uploadedImageUrl = `data:${image.type};base64,${base64}`;
            }
            else {
                uploadedImageUrl = image; // poate fi string sau undefined
            }

            const project = await databases.updateDocument(
                DATABASE_ID,
                PROJECTS_ID,
                projectId,
                {
                    name,
                    imageUrl: uploadedImageUrl
                }
            );

            return c.json({ data: project });
        }
    )

    .delete(
        "/:projectId",
        sessionMiddleware,
        async (c) => {
            const databases = c.get("databases");
            const user = c.get("user");
            const { projectId } = c.req.param();

            const existingProject = await databases.getDocument<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                projectId
            );

            const member = await getMember(
                {
                    databases,
                    userId: user.$id,
                    workspaceId: existingProject.workspaceId
                }
            );

            if (!member) {
                return c.json({ error: "You don't have permission to delete this workspace." }, 401);
            }

            //TODO: delete tasks

            await databases.deleteDocument(
                DATABASE_ID,
                PROJECTS_ID,
                projectId
            );

            return c.json({ data: { $id: existingProject.$id } });
        }
    )

    .get("/:projectId/analytics",
        sessionMiddleware,
        async (c) => {
            const databases = c.get("databases");
            const user = c.get("user");
            const { projectId } = c.req.param();

            const project = await databases.getDocument<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                projectId
            );

            const member = await getMember(
                {
                    databases,
                    userId: user.$id,
                    workspaceId: project.workspaceId
                }
            );

            if (!member) {
                return c.json({ error: "You don't have permission to view this project's analytics." }, 401);
            }

            const now = new Date();
            const thisMonthStart = startOfMonth(now);
            const thisMonthEnd = endOfMonth(now);
            const lastMonthStart = startOfMonth(subMonths(now, 1));
            const lastMonthEnd = endOfMonth(subMonths(now, 1));

            const thisMonthTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),

                ]
            );

            const lastMonthTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),

                ]
            );

            const taskCount = thisMonthTasks.total;
            const taskDifference = taskCount - lastMonthTasks.total;


            const thisMonthAssignedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.equal("assigneeId", member.$id),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),

                ]
            );

            const lastMonthAssignedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.equal("assigneeId", member.$id),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),

                ]
            );

            const assignedTaskCount = thisMonthAssignedTasks.total;
            const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.total;

            const thisMonthIncompletedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),

                ]
            );

            const lastMonthIncompletedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),

                ]
            );

            const incompletedTaskCount = thisMonthIncompletedTasks.total;
            const incompletedTaskDifference = incompletedTaskCount - lastMonthIncompletedTasks.total;


            const thisMonthCompletedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.equal("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),

                ]
            );

            const lastMonthCompletedTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.equal("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),

                ]
            );

            const completedTaskCount = thisMonthCompletedTasks.total;
            const completedTaskDifference = completedTaskCount - lastMonthCompletedTasks.total;


            const thisMonthOverdueTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.lessThan("dueDate", now.toISOString()),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),

                ]
            );

            const lastMonthOverdueTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("projectId", projectId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.lessThan("dueDate", now.toISOString()),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),

                ]
            );

            const overdueTaskCount = thisMonthOverdueTasks.total;
            const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasks.total;




            // Return project analytics data
            return c.json({
                data: {
                    taskCount,
                    taskDifference,
                    assignedTaskCount,
                    assignedTaskDifference,
                    completedTaskCount,
                    completedTaskDifference,
                    incompletedTaskCount,
                    incompletedTaskDifference,
                    overdueTaskCount,
                    overdueTaskDifference,
                }
            });
        }
    )

export default app;