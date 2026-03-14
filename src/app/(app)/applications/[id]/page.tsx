import { createSupabaseServer } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateApplicationStatus } from "@/app/actions/applications";
import { uploadDocument } from "@/app/actions/documents";
import { sendSignature } from "@/app/actions/signatures";
import { completeTask } from "@/app/actions/tasks";
import { StatusStream } from "@/components/forms/status-stream";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { member } = await requireTenantMember();
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data: application } = await supabase
    .from("loan_applications")
    .select(
      `id, status, requested_amount, requested_term_months, channel, data, created_at,
      borrowers(first_name,last_name,phone),
      loan_products(name, base_rate)`
    )
    .eq("id", id)
    .eq("tenant_id", member.tenant_id)
    .maybeSingle();

  const { data: statusEvents } = await supabase
    .from("application_status_events")
    .select("id, status, note, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const { data: documents } = await supabase
    .from("documents")
    .select("id, kind, status, created_at")
    .eq("application_id", id);

  const { data: credit } = await supabase
    .from("credit_reports")
    .select("score")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const { data: decisions } = await supabase
    .from("credit_decisions")
    .select("decision, reason, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const { data: compliance } = await supabase
    .from("compliance_checks")
    .select("rule, status")
    .eq("application_id", id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const { data: signatures } = await supabase
    .from("signature_requests")
    .select("id, status, provider, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const { data: risk } = await supabase
    .from("risk_assessments")
    .select("score, band, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!application) {
    return <div>Application not found.</div>;
  }

  const primaryBorrower = Array.isArray(application.borrowers)
    ? application.borrowers[0]
    : application.borrowers;
  const product = Array.isArray(application.loan_products)
    ? application.loan_products[0]
    : application.loan_products;

  async function handleUpdateApplicationStatus(formData: FormData) {
    "use server";
    await updateApplicationStatus(formData);
  }

  async function handleUploadDocument(formData: FormData) {
    "use server";
    await uploadDocument(formData);
  }

  async function handleSendSignature(formData: FormData) {
    "use server";
    await sendSignature(formData);
  }

  async function handleCompleteTask(formData: FormData) {
    "use server";
    await completeTask(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Application {application.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted">
            {primaryBorrower?.first_name} {primaryBorrower?.last_name}
          </p>
        </div>
        <Badge tone={application.status === "approved" ? "success" : application.status === "rejected" ? "danger" : "warning"}>
          {application.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Borrower + Loan Details</CardTitle>
            </CardHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Amount</p>
                <p className="text-lg font-semibold">
                  ${Number(application.requested_amount ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Term</p>
                <p className="text-lg font-semibold">
                  {application.requested_term_months} months
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Product</p>
                <p className="text-lg font-semibold">{product?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Channel</p>
                <p className="text-lg font-semibold">{application.channel}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Pricing rate</p>
                <p className="text-lg font-semibold">{application.data?.pricingRate ?? "-"}%</p>
              </div>
              <div>
                <p className="text-xs text-muted">Credit score</p>
                <p className="text-lg font-semibold">{credit?.score ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Risk band</p>
                <p className="text-lg font-semibold">{risk?.band ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Risk score</p>
                <p className="text-lg font-semibold">{risk?.score ?? "-"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" action={handleUpdateApplicationStatus}>
              <input type="hidden" name="applicationId" value={application.id} />
              <Select name="status" defaultValue={application.status}>
                <option value="submitted">submitted</option>
                <option value="manual_review">manual_review</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="closed">closed</option>
              </Select>
              <Input name="note" placeholder="Status note" />
              <Button type="submit">Update</Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" action={handleUploadDocument}>
              <input type="hidden" name="applicationId" value={application.id} />
              <Select name="kind" required>
                <option value="">Select kind</option>
                <option value="paystub">Paystub</option>
                <option value="bank_statement">Bank statement</option>
                <option value="id_document">ID document</option>
              </Select>
              <Input name="file" type="file" required />
              <Button type="submit">Upload</Button>
            </form>
            <div className="mt-4 space-y-2 text-sm">
              {documents?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between">
                  <span>{doc.kind}</span>
                  <Badge tone={doc.status === "uploaded" ? "warning" : "success"}>{doc.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <StatusStream applicationId={application.id} initialEvents={statusEvents ?? []} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Decisioning</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              {decisions?.map((decision) => (
                <div key={decision.created_at} className="rounded-2xl border border-border p-3">
                  <Badge tone={decision.decision === "approved" ? "success" : decision.decision === "rejected" ? "danger" : "warning"}>
                    {decision.decision}
                  </Badge>
                  <p className="mt-2 text-xs text-muted">{decision.reason}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Checks</CardTitle>
            </CardHeader>
            <div className="space-y-2 text-sm">
              {compliance?.map((check) => (
                <div key={check.rule} className="flex items-center justify-between">
                  <span>{check.rule}</span>
                  <Badge tone={check.status === "pass" ? "success" : "warning"}>{check.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-Signature</CardTitle>
            </CardHeader>
            <form action={handleSendSignature}>
              <input type="hidden" name="applicationId" value={application.id} />
              <Button type="submit" variant="secondary">Send signature request</Button>
            </form>
            <div className="mt-3 space-y-2 text-sm">
              {signatures?.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between">
                  <span>{sig.provider}</span>
                  <Badge tone={sig.status === "completed" ? "success" : "warning"}>{sig.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Underwriting Tasks</CardTitle>
            </CardHeader>
            <div className="space-y-2 text-sm">
              {tasks?.map((task) => (
                <div key={task.id} className="flex items-center justify-between">
                  <span>{task.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={task.status === "open" ? "warning" : "success"}>{task.status}</Badge>
                    {task.status === "open" ? (
                      <form action={handleCompleteTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <Button type="submit" size="sm" variant="secondary">Complete</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
