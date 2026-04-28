import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileWarning, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Employee { id: string; full_name: string; email: string; }

interface Props {
  employees: Employee[];
  companyId: string;
  /** YYYY-MM */
  month: string;
  onSaved: () => void;
}

interface ParsedRow {
  email: string;
  bank: string;
  target: number;
  /** resolved user_id if email matched */
  userId?: string;
  /** human-readable error if invalid */
  error?: string;
}

const SAMPLE = `email,bank,target
alice@acme.com,SBI,25
alice@acme.com,HDFC,15
bob@acme.com,AXIS,30
`;

function parseCsv(text: string): { email: string; bank: string; target: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(',').map((s) => s.trim());
  const ie = header.indexOf('email');
  const ib = header.indexOf('bank');
  const it = header.indexOf('target');
  if (ie === -1 || ib === -1 || it === -1) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((s) => s.trim());
    return { email: cols[ie] ?? '', bank: cols[ib] ?? '', target: cols[it] ?? '' };
  });
}

export function CsvBulkUpload({ employees, companyId, month, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [saving, setSaving] = useState(false);

  const validRows = rows.filter((r) => !r.error);

  function reset() {
    setRows([]);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ''));
      if (parsed.length === 0) {
        toast.error('CSV must have headers: email, bank, target');
        return;
      }
      const empByEmail = new Map(employees.map((e) => [e.email.toLowerCase(), e]));
      const next: ParsedRow[] = parsed.map(({ email, bank, target }) => {
        const t = Number(target);
        const emp = empByEmail.get(email.toLowerCase());
        let error: string | undefined;
        if (!email) error = 'Missing email';
        else if (!emp) error = 'Employee not found';
        else if (!bank) error = 'Missing bank';
        else if (!Number.isFinite(t) || t < 0) error = 'Invalid target';
        return {
          email,
          bank: bank.toUpperCase(),
          target: Number.isFinite(t) ? t : 0,
          userId: emp?.id,
          error,
        };
      });
      setRows(next);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function commit() {
    if (validRows.length === 0) return;
    setSaving(true);
    const monthDate = `${month}-01`;
    const payload = validRows.map((r) => ({
      company_id: companyId,
      user_id: r.userId!,
      bank: r.bank,
      month: monthDate,
      target: r.target,
    }));
    const { error } = await supabase
      .from('loan_targets')
      .upsert(payload, { onConflict: 'user_id,month,bank' });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${validRows.length} targets saved`);
    setOpen(false);
    reset();
    onSaved();
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'target-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-1" />Bulk CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk upload targets · {month}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="p-4 bg-muted/30 flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-medium mb-1">CSV format</p>
              <p className="text-muted-foreground text-xs">
                Headers required: <code>email</code>, <code>bank</code>, <code>target</code>.
                One row per employee + bank. Existing targets for the same employee/bank/month are overwritten.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-3 w-3 mr-1" />Template
            </Button>
          </Card>

          <div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:opacity-90"
            />
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary" className="bg-success/15 text-success">{validRows.length} valid</Badge>
                <Badge variant="secondary" className="bg-destructive/15 text-destructive">{rows.length - validRows.length} errors</Badge>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Bank</th>
                      <th className="text-left p-2">Target</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.bank}</td>
                        <td className="p-2">{r.target}</td>
                        <td className="p-2">
                          {r.error
                            ? <span className="text-destructive flex items-center gap-1"><FileWarning className="h-3 w-3" /> {r.error}</span>
                            : <span className="text-success">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving || validRows.length === 0} onClick={commit}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save ${validRows.length} targets`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
