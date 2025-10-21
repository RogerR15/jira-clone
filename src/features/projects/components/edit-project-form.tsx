"use client"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProjectSchema } from "../schemas";
import { z } from "zod";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeftIcon, CopyIcon, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";


import { useConfirm } from "@/hooks/use-confirm";

import { toast } from "sonner";
import { useUpdateProject } from "../api/use-update-project";
import { Project } from "../types";
import { useDeleteProject } from "../api/use-delete-project";


interface EditProjectFormProps {
    onCancel?: () => void;
    initialValues: Project;
}

export const EditProjectForm = ({ onCancel, initialValues }: EditProjectFormProps) => {
    const router = useRouter();
    const { mutate, isPending } = useUpdateProject();
    const { mutate: deleteProject, isPending: isDeletingProject } = useDeleteProject();



    const [DeleteDialog, confirmDelete] = useConfirm(
        "Delete Project",
        "This action cannot be undone.",
        "destructive"
    );




    const inputRef = useRef<HTMLInputElement>(null);


    const form = useForm<z.infer<typeof updateProjectSchema>>({
        resolver: zodResolver(updateProjectSchema),
        defaultValues: {
            ...initialValues,
            image: initialValues.imageUrl ?? "",
        }
    });

    const handleDelete = async () => {
        const ok = await confirmDelete();

        if (!ok) return;

        deleteProject({
            param: { projectId: initialValues.$id }
        }, {
            onSuccess: () => {
                window.location.href = `/`;
            }
        });
    }



    const onSubmit = (values: z.infer<typeof updateProjectSchema>) => {

        const finalValues = {
            ...values,
            image: values.image instanceof File ? values.image : "",
        };

        mutate({
            form: finalValues,
            param: { projectId: initialValues.$id }
        }
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("image", file);
        }
    }



    return (
        <div className="flex flex-col gap-y-7">
            <DeleteDialog />

            <Card className="w-full h-full border-none shadow-none">
                <CardHeader className="flex p-7">
                    <Button size="sm" variant="secondary" onClick={onCancel ? onCancel : () => router.push(`/workspaces/${initialValues.workspaceId}/projects/${initialValues.$id}`)}>
                        <ArrowLeftIcon className="size-4 mr-2" />
                        Back
                    </Button>
                    <CardTitle className="text-xl font-bold">{initialValues.name}</CardTitle>
                </CardHeader>
                <div className="px-7">
                    <DottedSeparator />
                </div>
                <CardContent className="p-7">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="flex flex-col gap-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Project Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter project name"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="image"
                                    render={({ field }) => (
                                        <div className="flex flex-col gap-y-2">
                                            <div className="flex items-center gap-x-5">
                                                {field.value ? (
                                                    <div className="size-[72px] relative rounded-md overflow-hidden">
                                                        <Image
                                                            src={
                                                                field.value instanceof File
                                                                    ? URL.createObjectURL(field.value)
                                                                    : field.value
                                                            }
                                                            alt="Logo"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Avatar className="size-[72px]">
                                                        <AvatarFallback>
                                                            <ImageIcon className="size-[36px] text-neutral-400" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className="flex flex-col">
                                                    <p className="text-sm">
                                                        Project Icon
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        JPG, PNG, SVG or JPEG, max 1mb
                                                    </p>
                                                    <input
                                                        className="hidden"
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.svg"
                                                        ref={inputRef}
                                                        onChange={handleImageChange}
                                                        disabled={isPending}
                                                    />
                                                    {field.value ? (
                                                        <Button
                                                            type="button"
                                                            disabled={isPending}
                                                            variant="destructive"
                                                            size="xs"
                                                            onClick={() => {
                                                                field.onChange(null);
                                                                if (inputRef.current) {
                                                                    inputRef.current.value = "";
                                                                }
                                                            }}
                                                            className="w-fit mt-2"
                                                        >
                                                            Remove Image
                                                        </Button>

                                                    ) : (<Button
                                                        type="button"
                                                        disabled={isPending}
                                                        variant="teritary"
                                                        size="xs"
                                                        onClick={() => inputRef.current?.click()}
                                                        className="w-fit mt-2"
                                                    >
                                                        Upload Image
                                                    </Button>)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                            <DottedSeparator className="py-7" />
                            <div className="flex items-center justify-between">
                                <Button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isPending}
                                    size="lg"
                                    variant="secondary"
                                    className={cn(!onCancel && "invisible")}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={isPending}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>



            <Card className="w-full h-full border-none shadow-none">
                <CardContent className="p-7">
                    <div className="flex flex-col gap-y-4">
                        <h3 className="font-bold">Danger Zone</h3>
                        <p className="text-sm text-muted-foreground">
                            Deleting your project is a permanent action and will remove all associated data.
                        </p>
                        <DottedSeparator className="py-7" />
                        <Button className="mt-6 w-fit ml-auto"
                            variant="destructive"
                            size="sm"
                            type="button"
                            disabled={isPending || isDeletingProject}
                            onClick={handleDelete}
                        >
                            Delete Project
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}