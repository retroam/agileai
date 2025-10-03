import { ColumnDef } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Issue } from "@/lib/api"

// Column header component for sorting
function SortableHeader({ column, title }: { column: any; title: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      {{
        asc: <ArrowUp className="ml-2 h-4 w-4" />,
        desc: <ArrowDown className="ml-2 h-4 w-4" />,
      }[column.getIsSorted() as string] ?? <ChevronsUpDown className="ml-2 h-4 w-4" />}
    </Button>
  )
}

export const columns: ColumnDef<Issue>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <div className="font-medium max-w-[200px] truncate">
        {row.getValue("title")}
      </div>
    ),
  },
  {
    accessorKey: "body",
    header: ({ column }) => <SortableHeader column={column} title="Body" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        {row.getValue("body")}
      </div>
    ),
  },
  {
    accessorKey: "state",
    header: ({ column }) => <SortableHeader column={column} title="State" />,
    cell: ({ row }) => {
      const state = row.getValue("state") as string
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${
          state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {state}
        </span>
      )
    },
  },
  {
    accessorKey: "user",
    header: ({ column }) => <SortableHeader column={column} title="User" />,
  },
  {
    accessorKey: "comments",
    header: ({ column }) => <SortableHeader column={column} title="Comments" />,
    sortingFn: "number",
  },
  {
    accessorKey: "labels",
    header: "Labels",
    cell: ({ row }) => {
      const labels = row.getValue("labels") as string[]
      return (
        <div className="flex gap-1 flex-wrap">
          {labels.map((label, i) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              {label}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader column={column} title="Created" />,
    cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleDateString(),
    sortingFn: "datetime",
  },
  {
    accessorKey: "closed_at",
    header: ({ column }) => <SortableHeader column={column} title="Closed" />,
    cell: ({ row }) => {
      const date = row.getValue("closed_at")
      return date ? new Date(date as string).toLocaleDateString() : '-'
    },
    sortingFn: "datetime",
  },
] 