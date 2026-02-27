import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import Agent from "@/components/Agent";
import QuickInterviewSetup from "@/components/QuickInterviewSetup";

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h3>Interview generation</h3>
          <p className="text-light-100">Choose voice-based generation or quick setup.</p>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-border">
            <div className="card p-6 flex flex-col gap-4">
              <h3>Voice-generated interview</h3>
              <p className="text-light-100">
                Use the voice workflow to generate a custom interview with AI.
              </p>
              <Agent userName={user.name} userId={user.id} type="generate" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3>Quick setup</h3>
            <QuickInterviewSetup user={user} />
          </div>
        </section>
      </div>
    </>
  );
};

export default Page;
