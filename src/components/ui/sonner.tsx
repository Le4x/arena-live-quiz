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
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg !text-xs !max-w-[280px] !py-2 !px-3",
          description: "group-[.toast]:text-muted-foreground !text-[10px]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground !text-xs",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground !text-xs",
          title: "!text-xs !font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
