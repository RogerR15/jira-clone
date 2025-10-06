import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../schemas';
import { sessionMiddleware } from '@/lib/session-middleware';
import { DATABASE_ID, IMAGES_BUCKET_ID, MEMBERS_ID, WORKSPACES_ID } from '@/config';
import { ID, Query } from 'node-appwrite';
import { MemberRole } from '@/features/members/types';
import { generateInviteCode } from '@/lib/utils';
import z from 'zod';
import { getMember } from '@/features/members/utils';
import { Workspace } from '../types';

const app = new Hono()
    .get("/", sessionMiddleware, async (c) => {
        const user = c.get('user');
        const databases = c.get('databases');

        const members = await databases.listDocuments(
            DATABASE_ID,
            MEMBERS_ID,
            [Query.equal("userId", user.$id)],
        );

        if (!members.total) {
            return c.json({ data: { documents: [], total: 0 } });
        }

        const workspaceIds = members.documents.map((member) => member.workspaceId);

        const workspaces = await databases.listDocuments(
            DATABASE_ID,
            WORKSPACES_ID,
            [
                Query.orderDesc("$createdAt"),
                Query.contains("$id", workspaceIds),

            ],
        );

        return c.json({ data: workspaces });
    })


    .post(
        "/",
        zValidator('form', createWorkspaceSchema),
        sessionMiddleware,
        async (c) => {
            const databases = c.get('databases');
            const storage = c.get('storage');
            const user = c.get('user');

            const { name, image } = c.req.valid('form');

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


            const workspace = await databases.createDocument(
                DATABASE_ID,
                WORKSPACES_ID,
                ID.unique(),
                {
                    name,
                    userId: user.$id,
                    imageUrl: uploadedImageUrl,
                    inviteCode: generateInviteCode(6),
                },

            );

            console.log("VALIDATED FORM:", c.req.valid("form"));

            await databases.createDocument(
                DATABASE_ID,
                MEMBERS_ID,
                ID.unique(),
                {
                    workspaceId: workspace.$id,
                    userId: user.$id,
                    role: MemberRole.ADMIN,
                }
            );


            return c.json({ data: workspace });
        }
    )
    .patch(
        "/:workspaceId",
        sessionMiddleware,
        zValidator("form", updateWorkspaceSchema),
        async (c) => {
            const databases = c.get("databases");
            const storage = c.get("storage");
            const user = c.get("user");

            const { workspaceId } = c.req.param();
            const { name, image } = c.req.valid("form");

            const member = await getMember(
                {
                    databases,
                    userId: user.$id,
                    workspaceId
                }
            );

            if (!member || member.role !== MemberRole.ADMIN) {
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

            const workspace = await databases.updateDocument(
                DATABASE_ID,
                WORKSPACES_ID,
                workspaceId,
                {
                    name,
                    imageUrl: uploadedImageUrl
                }
            );

            return c.json({ data: workspace });
        }
    )

    .delete(
        "/:workspaceId",
        sessionMiddleware,
        async (c) => {
            const databases = c.get("databases");
            const user = c.get("user");
            const { workspaceId } = c.req.param();
            const member = await getMember(
                { databases, userId: user.$id, workspaceId }
            );

            if (!member || member.role !== MemberRole.ADMIN) {
                return c.json({ error: "You don't have permission to delete this workspace." }, 401);
            }

            //TODO: delete members, projects, tasks

            await databases.deleteDocument(
                DATABASE_ID,
                WORKSPACES_ID,
                workspaceId
            );

            return c.json({ data: { $id: workspaceId } });
        }
    )

    .post(
        "/:workspaceId/reset-invite-code",
        sessionMiddleware,
        async (c) => {
            const databases = c.get("databases");
            const user = c.get("user");
            const { workspaceId } = c.req.param();
            const member = await getMember(
                { databases, userId: user.$id, workspaceId }
            );

            if (!member || member.role !== MemberRole.ADMIN) {
                return c.json({ error: "You don't have permission to delete this workspace." }, 401);
            }


            const workspace = await databases.updateDocument(
                DATABASE_ID,
                WORKSPACES_ID,
                workspaceId,
                {
                    inviteCode: generateInviteCode(6),
                }
            );

            return c.json({ data: workspace });
        }
    )

    .post(
        "/:workspaceId/join",
        sessionMiddleware,
        zValidator("json", z.object({
            code: z.string()
        })),
        async (c) => {
            const { workspaceId } = c.req.param();
            const { code } = c.req.valid("json");
            const databases = c.get("databases");
            const user = c.get("user");

            console.log("JOIN REQUEST:", { workspaceId, code, userId: user.$id }); // Add this

            const member = await getMember(
                {
                    databases,
                    workspaceId,
                    userId: user.$id,
                });

            if (member) {
                console.log("ALREADY A MEMBER"); // Add this
                return c.json({ error: "You are already a member of this workspace." }, 400);
            }

            const workspace = await databases.getDocument<Workspace>(
                DATABASE_ID,
                WORKSPACES_ID,
                workspaceId
            );

            console.log("INVITE EXPECTED:", workspace.inviteCode);
            console.log("INVITE RECEIVED:", code); // Add this
            console.log("MATCH:", workspace.inviteCode === code); // Add this

            console.log("INVITE EXPECTED:", workspace.inviteCode);

            if (workspace.inviteCode !== code) {
                return c.json({ error: "Invalid invite code." }, 400);
            }

            await databases.createDocument(
                DATABASE_ID,
                MEMBERS_ID,
                ID.unique(),
                {
                    workspaceId,
                    userId: user.$id,
                    role: MemberRole.MEMBER,
                },
            );

            return c.json({ data: workspace });
        }
    );


export default app;

