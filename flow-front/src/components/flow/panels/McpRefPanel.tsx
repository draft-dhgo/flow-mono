import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface McpRefPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  fieldPath: string;
  mcpServers: { id: string; name: string }[];
  label?: string;
}

export function McpRefPanel({ form, fieldPath, mcpServers, label = 'MCP 서버 참조' }: McpRefPanelProps) {
  const fieldArray = useFieldArray({ control: form.control, name: fieldPath });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fieldArray.append({ mcpServerId: '', envOverrides: {} })}
        >
          <Plus className="h-3 w-3 mr-1" />
          추가
        </Button>
      </div>
      {fieldArray.fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 mb-2">
          <Select
            value={form.watch(`${fieldPath}.${index}.mcpServerId`)}
            onValueChange={(v) => form.setValue(`${fieldPath}.${index}.mcpServerId`, v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="MCP 서버 선택" />
            </SelectTrigger>
            <SelectContent>
              {mcpServers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fieldArray.remove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
