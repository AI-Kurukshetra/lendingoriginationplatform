import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { acceptBorrowerInvite } from "@/app/actions/invites";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  await requireUser();
  const { token } = await params;
  const admin = createSupabaseAdmin();

  const { data: invite } = await admin
    .from("borrower_invites")
    .select("id, status, tenants(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return <div>Invite not found.</div>;
  }

  const inviteTenant = Array.isArray(invite.tenants) ? invite.tenants[0] : invite.tenants;

  async function handleAcceptBorrowerInvite(formData: FormData) {
    "use server";
    await acceptBorrowerInvite(formData);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Borrower Invite</h1>
      <Card>
        <p className="text-sm text-muted">You have been invited to apply with</p>
        <p className="text-lg font-semibold">{inviteTenant?.name}</p>
        <p className="mt-2 text-xs text-muted">Status: {invite.status}</p>
        <form className="mt-4" action={handleAcceptBorrowerInvite}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Accept invite</Button>
        </form>
      </Card>
    </div>
  );
}
