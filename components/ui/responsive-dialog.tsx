"use client";

import * as React from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const ResponsiveDialogContext = React.createContext<{ isDesktop: boolean }>({
  isDesktop: false,
});

function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

function ResponsiveDialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext);

  if (isDesktop) {
    return (
      <DialogContent className={cn("sm:max-w-lg", className)}>
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent className={className}>{children}</DrawerContent>
  );
}

function ResponsiveDialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext);
  return isDesktop ? (
    <DialogHeader className={className}>{children}</DialogHeader>
  ) : (
    <DrawerHeader className={className}>{children}</DrawerHeader>
  );
}

function ResponsiveDialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext);
  return isDesktop ? (
    <DialogTitle className={className}>{children}</DialogTitle>
  ) : (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  );
}

function ResponsiveDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext);
  return isDesktop ? (
    <DialogDescription className={className}>{children}</DialogDescription>
  ) : (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  );
}

function ResponsiveDialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext);
  return isDesktop ? (
    <DialogFooter className={className}>{children}</DialogFooter>
  ) : (
    <DrawerFooter className={className}>{children}</DrawerFooter>
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
};
