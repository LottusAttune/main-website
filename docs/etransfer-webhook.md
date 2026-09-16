# Recording Interac e-transfers automatically

Interac does not offer a webhook. What every bank does send is an email to the
receiving address (info@lotusattune.com) each time an e-transfer is
deposited: "INTERAC e-Transfer: A money transfer from JANE DOE has been
automatically deposited", with the amount and the sender's message inside.

A short script that lives in that Gmail account reads those emails every few
minutes and posts each new one to the website, which records the payment on
the matching invoice and sends the receipt and booking confirmation exactly as
it does for a card payment.

## One-time setup (about ten minutes)

1. On Vercel, add an environment variable `ETRANSFER_WEBHOOK_SECRET` with a
   long random value (any password generator, 30+ characters). Redeploy.
2. Signed in to Google as info@lotusattune.com, open <https://script.google.com>
   and choose **New project**.
3. Replace the editor contents with the script below, paste the same secret
   into `SECRET`, and save (name it "Lotus e-transfers").
4. Press **Run** once with `checkEtransfers` selected and approve the Gmail
   permission it asks for.
5. Left sidebar → **Triggers** → **Add trigger**: function `checkEtransfers`,
   event source "Time-driven", type "Minutes timer", every 5 minutes. Save.

That is all. Processed emails get a Gmail label "Lotus recorded" so nothing
is ever posted twice, and the website also refuses duplicates by email id.

## The script

```javascript
const WEBHOOK = 'https://www.lotusattune.com/api/etransfer/webhook';
const SECRET = 'PASTE THE ETRANSFER_WEBHOOK_SECRET VALUE HERE';
const DONE_LABEL = 'Lotus recorded';

function checkEtransfers() {
  const label = GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL);
  const query = 'from:(interac.ca) newer_than:7d -label:"' + DONE_LABEL + '"';
  const threads = GmailApp.search(query, 0, 20);
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      const subject = msg.getSubject() || '';
      const body = msg.getPlainBody() || '';
      if (!/deposited|accepted|received/i.test(subject + ' ' + body)) return;

      const amountMatch = /\$\s?([\d,]+(?:\.\d{2})?)/.exec(body) || /\$\s?([\d,]+(?:\.\d{2})?)/.exec(subject);
      if (!amountMatch) return;
      const amount = Number(amountMatch[1].replace(/,/g, ''));
      const senderMatch = /from\s+(.+?)\s+has been/i.exec(subject) || /from\s+(.+?)\s+has been/i.exec(body);
      const messageMatch = /Message:\s*(.+)/i.exec(body);

      const payload = {
        amount: amount,
        sender: senderMatch ? senderMatch[1].trim() : '',
        message: messageMatch ? messageMatch[1].trim() : '',
        subject: subject,
        externalRef: 'gmail-' + msg.getId(),
        receivedAt: msg.getDate().toISOString(),
      };
      const response = UrlFetchApp.fetch(WEBHOOK, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() === 200) thread.addLabel(label);
      else console.log('Webhook said ' + response.getResponseCode() + ': ' + response.getContentText());
    });
  });
}
```

## How a transfer is matched

1. The invoice number (for example `LA-2026-0007`) anywhere in the transfer's
   message: the surest match. The booking confirmation asks clients to put it
   there.
2. Otherwise, an open invoice whose balance or deposit equals the amount
   exactly and whose client name matches the sender's name. Only a single hit
   counts.
3. Anything else is emailed to Silvana as "record by hand"; the studio's
   Record payment button does the rest.
