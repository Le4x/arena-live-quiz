import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      offset={12}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/80 group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-md !text-[10px] !max-w-[200px] !py-1.5 !px-2.5 backdrop-blur-sm",
          description: "group-[.toast]:text-muted-foreground !text-[9px]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground !text-[10px]",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground !text-[10px]",
          title: "!text-[10px] !font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
