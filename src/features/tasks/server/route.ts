import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { DATABASE_ID, MEMBERS_ID, PROJECTS_ID, TASKS_ID } from "@/config";
import { ID, Query } from "node-appwrite";
import z from "zod";
import { Task, TaskStatus } from "../types";
import { createAdminClient } from "@/lib/appwrite";
import { Project } from "@/features/projects/types";


const app = new Hono()

    .get(
        "/",
        sessionMiddleware,
        zValidator("query", z.object({
            workspaceId: z.string(),
            projectId: z.string().nullish(),
            assigneeId: z.string().nullish(),
            status: z.nativeEnum(TaskStatus).nullish(),
            search: z.string().nullish(),
            dueDate: z.coerce.date().nullish(),
        })),
        async (c) => {
            const { users } = await createAdminClient();
            const databases = c.get('databases');
            const user = c.get('user');

            const {
                workspaceId,
                projectId,
                status,
                search,
                assigneeId,
                dueDate,
            } = c.req.valid('query');

            const member = await getMember({
                databases,
                userId: user.$id,
                workspaceId,
            });

            if (!member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const query = [
                Query.equal("workspaceId", workspaceId),
                Query.orderDesc("$createdAt"),
            ];

            if (projectId) {
                console.log("projectId: ", projectId);
                query.push(Query.equal("projectId", projectId));
            }

            if (status) {
                console.log("status: ", status);
                query.push(Query.equal("status", status));
            }

            if (assigneeId) {
                console.log("assigneeId: ", assigneeId);
                query.push(Query.equal("assigneeId", assigneeId));
            }

            if (dueDate) {
                console.log("dueDate: ", dueDate);
                query.push(Query.equal("dueDate", dueDate.toISOString()));
            }

            if (search) {
                console.log("search: ", search);
                query.push(Query.search("name", search));
            }

            const tasks = await databases.listDocuments<Task>(
                DATABASE_ID,
                TASKS_ID,
                query,
            );

            const projectIds = tasks.documents.map((task) => task.projectId);
            const assigneeIds = tasks.documents.map((task) => task.assigneeId);

            const projects = await databases.listDocuments<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                projectIds.length > 0 ? [Query.contains("$id", projectIds)] : []
            );

            const members = await databases.listDocuments(
                DATABASE_ID,
                MEMBERS_ID,
                assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : []
            );

            const assignees = await Promise.all(
                members.documents.map(async (member) => {
                    try {
                        const user = await users.get(member.userId); // <-- schimbat aici
                        return {
                            ...member,
                            name: user.name,
                            email: user.email,
                        };
                    } catch (error) {
                        console.error(`User not found for member ${member.$id}`, error);
                        return {
                            ...member,
                            name: "Unknown",
                            email: "unknown@example.com",
                        };
                    }
                })
            );


            const populatedTasks = tasks.documents.map((task) => {
                const project = projects.documents.find((project) => project.$id === task.projectId);
                const assignee = assignees.find((assignee) => assignee.$id === task.assigneeId);

                return {
                    ...task,
                    project: project ? { name: project.name } : null,
                    assignee: assignee ? { name: assignee.name } : null,
                };
            });

            return c.json({
                data: {
                    ...tasks,
                    documents: populatedTasks,
                }
            });
        }
    )

    .post(
        "/",
        sessionMiddleware,
        zValidator("json", createTaskSchema),
        async (c) => {
            const user = c.get('user');
            const databases = c.get('databases');

            const {
                name,
                status,
                workspaceId,
                projectId,
                dueDate,
                assigneeId,

            } = c.req.valid('json');

            const member = await getMember(
                {
                    databases,
                    userId: user.$id,
                    workspaceId,
                }
            );

            if (!member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const highestPostionTasks = await databases.listDocuments(
                DATABASE_ID,
                TASKS_ID,
                [
                    Query.equal("status", status),
                    Query.equal("workspaceId", workspaceId),
                    Query.orderDesc("position"),
                    Query.limit(1),
                ]
            );

            const newPosition = highestPostionTasks.documents.length > 0 ? highestPostionTasks.documents[0].position + 1000 : 1000;

            const task = await databases.createDocument(
                DATABASE_ID,
                TASKS_ID,
                ID.unique(),
                {
                    name,
                    status,
                    workspaceId,
                    projectId,
                    dueDate,
                    assigneeId,
                    position: newPosition,
                }
            );

            return c.json({ data: task });
        }
    )

export default app;