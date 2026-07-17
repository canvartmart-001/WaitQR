import { KioskForm } from "./KioskForm";

export function CreatePage({ ticketIssuer, desks, services, labels }) {
  return (
    <main className="qp-page-shell qp-kiosk-page-shell">
      <section className="qp-kiosk-panel w-full md:max-w-[560px] md:mx-auto">
        <KioskForm
          form={ticketIssuer.form}
          setForm={ticketIssuer.setForm}
          formError={ticketIssuer.formError}
          setFormError={ticketIssuer.setFormError}
          desks={desks}
          services={services}
          serviceWord={labels.serviceWord}
          onIssue={ticketIssuer.handleIssue}
          issueStep={ticketIssuer.issueStep}
          advanceIssueStep={ticketIssuer.advanceIssueStep}
          setIssueStep={ticketIssuer.setIssueStep}
          issuePending={ticketIssuer.issuePending}
        />
      </section>
    </main>
  );
}
