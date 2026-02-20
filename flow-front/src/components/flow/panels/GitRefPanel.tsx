import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface GitRefPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  fieldPath: string;
  gits: { id: string; url: string }[];
  label?: string;
}

export function GitRefPanel({ form, fieldPath, gits, label = 'Git 참조' }: GitRefPanelProps) {
  const fieldArray = useFieldArray({ control: form.control, name: fieldPath });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fieldArray.append({ gitId: '', baseBranch: '' })}
        >
          <Plus className="h-3 w-3 mr-1" />
          추가
        </Button>
      </div>
      {fieldArray.fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 mb-2">
          <Select
            value={form.watch(`${fieldPath}.${index}.gitId`)}
            onValueChange={(v) => form.setValue(`${fieldPath}.${index}.gitId`, v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Git 선택" />
            </SelectTrigger>
            <SelectContent>
              {gits.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            {...form.register(`${fieldPath}.${index}.baseBranch`)}
            placeholder="main"
            className="flex-1"
          />
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
