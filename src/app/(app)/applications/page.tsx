import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ApplicationsPage() {
  const { member } = await requireTenantMember();
  const supabase = await createSupabaseServer();

  const { data: applications } = await supabase
    .from("loan_applications")
    .select("id, status, requested_amount, created_at, borrowers(first_name, last_name)")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-sm text-muted">Monitor borrower intake across channels.</p>
        </div>
        <Link
          href="/applications/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          New application
        </Link>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Borrower</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {applications?.map((app) => (
              <tr key={app.id}>
                <Td>
                  <Link className="text-accent" href={`/applications/${app.id}`}>
                    {app.id.slice(0, 8)}
                  </Link>
                </Td>
                <Td>
                  {(Array.isArray(app.borrowers) ? app.borrowers[0] : app.borrowers)?.first_name} {(Array.isArray(app.borrowers) ? app.borrowers[0] : app.borrowers)?.last_name}
                </Td>
                <Td>${Number(app.requested_amount ?? 0).toLocaleString()}</Td>
                <Td>
                  <Badge tone={app.status === "approved" ? "success" : app.status === "rejected" ? "danger" : "warning"}>
                    {app.status}
                  </Badge>
                </Td>
                <Td>{new Date(app.created_at).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

