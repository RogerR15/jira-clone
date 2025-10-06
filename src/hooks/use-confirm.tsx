"use client";

import { JSX, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/responsive-modal";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

type ButtonProps = React.ComponentProps<typeof Button>;
type Resolver = (value: boolean) => void;

export const useConfirm = (
    title: string,
    message: string,
    variant: ButtonProps["variant"] = "primary" // folosește un variant valid
): [() => JSX.Element, () => Promise<boolean>] => {
    const [resolver, setResolver] = useState<Resolver | null>(null);

    const confirm = () => {
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    };

    const handleClose = () => {
        setResolver(null);
    };

    const handleConfirm = () => {
        resolver?.(true);
        handleClose();
    };

    const handleCancel = () => {
        resolver?.(false);
        handleClose();
    };

    const ConfirmationDialog = () => (
        <ResponsiveModal open={resolver !== null
        } onOpenChange={handleClose} >
            <Card className="w-full h-full border-none shadow-none" >
                <CardContent className="pt-8" >
                    <CardHeader className="p-0" >
                        <CardTitle>{title} </CardTitle>
                        < CardDescription > {message} </CardDescription>
                    </CardHeader>
                    < div className="pt-4 w-full flex flex-col gap-y-2 lg:flex-row gap-x-2 justify-between" >
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="w-full lg:w-auto"
                        >
                            Cancel
                        </Button>
                        < Button
                            variant={variant}
                            onClick={handleConfirm}
                            className="w-full lg:w-auto"
                        >
                            Confirm
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </ResponsiveModal>
    );

    return [ConfirmationDialog, confirm];
};
