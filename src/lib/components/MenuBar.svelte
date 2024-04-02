<script lang="ts">
    import { Menubar } from "bits-ui";
</script>

<Menubar.Root
    class="flex h-12 items-center gap-1 rounded-10px border border-dark-10 bg-background-alt px-[3px] shadow-mini"
>
    <Menubar.Menu>
        <Menubar.Trigger
            class="inline-flex h-8 cursor-default items-center justify-center rounded-9px px-1 text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted data-[state=open]:bg-muted"
            >View</Menubar.Trigger
        >
        <Menubar.Content
            class="z-50 w-full max-w-[220px]  border border-muted bg-background px-1 py-1.5 shadow-popover !ring-0 !ring-transparent "
            align="start"
            sideOffset={3}
        >
            <Menubar.Item></Menubar.Item>
        </Menubar.Content>
    </Menubar.Menu>
    <Menubar.Menu>
        <Menubar.Trigger
            class="inline-flex h-8 cursor-default items-center justify-center rounded-[9px] px-1 text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted data-[state=open]:bg-muted"
            >Edit</Menubar.Trigger
        >
        <Menubar.Content
            class="z-50 w-full max-w-[220px]  border border-muted bg-background px-1 py-1.5 shadow-popover"
            align="start"
            sideOffset={3}
        >
            <Menubar.Item
                class="flex h-8 select-none items-center py-1 pl-3 pr-1.5 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                >Preferences</Menubar.Item
            >
        </Menubar.Content>
    </Menubar.Menu>
</Menubar.Root>
