import { useState } from "react"

import { Button } from "~/components/Button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/Dialog"


interface DeleteConfirmationDialogProps {
    onConfirm: () => void;
}

export function DeleteDialogButton({ onConfirm }: DeleteConfirmationDialogProps) {

    const [open, setOpen] = useState(false);

    const handleConfirm = () => {
        onConfirm();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">Clear Database</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        All your past embeddings and visited sites will be deleted. This action cannot be undone. Are you sure?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-start">
                    <Button onClick={handleConfirm} variant="destructive">
                        Yes, delete my past history
                    </Button>
                    <DialogClose asChild>
                        <Button variant="secondary">
                            Cancel
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
