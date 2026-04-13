const CATEGORY_LABELS = {
    finanzplanung: 'Finanzanalyse / Finanzplanung 360°',
    altersvorsorge: 'Altersvorsorge planen / prüfen',
    immobilien: 'Immobilien als Kapitalanlage',
    bu: 'Arbeitskraftabsicherung prüfen / abschließen',
    andere: 'Etwas anderes',
};

const FIELD_LABELS = {
    // Gemeinsame Felder
    situation:             'Aktuelle Situation',
    onetime:               'Vorhandene Rücklagen / Eigenkapital',
    vertraege:             'Bestehende Lösungen',
    employment:            'Berufliche Situation',
    job_title:             'Berufsbezeichnung',
    net_income:            'Netto-Gehalt',
    birth_year:            'Geburtsjahr',
    lebensphase:           'Lebenssituation',
    entscheider:           'Entscheidung',
    zeitplan:              'Zeitplan',
    weitere_themen:        'Weitere Themen?',
    weitere_themen_inhalt: 'Weitere Themen Details',
    thema:                 'Anliegen',
    // Altersvorsorge
    rente_erwartung:       'Erwartete gesetzliche Rente',
    rente_bedarf:          'Gewünschtes Einkommen im Alter',
    // Finanzplanung
    ziele:                 'Finanzielle Ziele',
    // Immobilien
    immo_ziel:             'Ziel bei der Immobilie',
    // BU
    bu_situation:          'Arbeitskraft bereits abgesichert?',
    bu_taetigkeit:         'Art der Tätigkeit',
    bu_gesundheit:         'Gesundheitszustand',
    bu_sorge:              'Sorgen bei Ausfall',
    bu_staat_erwartung:    'Erwartete staatliche Leistung bei BU',
    bu_fixkosten:          'Monatlicher Bedarf (Fixkosten)',
    bu_lebensstandard:     'Monatlicher Bedarf (Lebensstandard)',
};

const EURO_FIELDS = new Set([
    'net_income', 'rente_erwartung', 'rente_bedarf',
    'bu_staat_erwartung', 'bu_fixkosten', 'bu_lebensstandard',
]);

function buildRow(label, value) {
    return `
        <tr>
            <td style="padding:10px 16px;font-size:0.85rem;color:#64748b;white-space:nowrap;vertical-align:top;width:40%;">${label}</td>
            <td style="padding:10px 16px;font-size:0.9rem;color:#0f1e42;font-weight:500;vertical-align:top;">${value}</td>
        </tr>`;
}

function buildEmailHtml(data) {
    const categoryLabel = CATEGORY_LABELS[data.category] || data.category;
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || '–';
    const date = new Date().toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const skipKeys = new Set(['privacy', 'info', 'category', 'first_name', 'last_name', 'email', 'phone']);

    const detailRows = Object.entries(data)
        .filter(([k, v]) => !skipKeys.has(k) && v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => {
            let display;
            if (Array.isArray(v)) {
                display = v.join(', ');
            } else if (EURO_FIELDS.has(k)) {
                display = `${Number(v).toLocaleString('de-DE')} €`;
            } else {
                display = v;
            }
            return buildRow(FIELD_LABELS[k] || k, display);
        })
        .join('');

    return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <div style="background:#0e8fb5;padding:24px 28px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.75);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Neue Beratungsanfrage</p>
      <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:700;">${name}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:0.9rem;">${categoryLabel}</p>
    </div>

    <div style="padding:20px 28px 0;">
      <table style="width:100%;border-collapse:collapse;background:#f0fafd;border-radius:8px;overflow:hidden;">
        <tbody>
          ${buildRow('E-Mail', `<a href="mailto:${data.email}" style="color:#0e8fb5;">${data.email}</a>`)}
          ${buildRow('Telefon', data.phone || '–')}
          ${buildRow('Eingegangen', date)}
        </tbody>
      </table>
    </div>

    ${detailRows ? `
    <div style="padding:16px 28px 0;">
      <p style="margin:0 0 8px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">Angaben aus dem Formular</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tbody>${detailRows}</tbody>
      </table>
    </div>` : ''}

    <div style="padding:24px 28px;margin-top:8px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:0.78rem;color:#94a3b8;">Diese Nachricht wurde automatisch über das Beratungsformular auf starkfinanz.de generiert.</p>
    </div>

  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;

    if (!data.email || !data.phone) {
        return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
    }

    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unbekannt';
    const categoryLabel = CATEGORY_LABELS[data.category] || data.category || 'Allgemein';

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Stark Finanz Formular <onboarding@resend.dev>',
                to: 'philipp.stark@starkfinanz.de',
                reply_to: data.email,
                subject: `Neue Anfrage: ${name} – ${categoryLabel}`,
                html: buildEmailHtml(data),
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Resend error:', err);
            return res.status(502).json({ error: 'E-Mail konnte nicht gesendet werden' });
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: 'Interner Fehler' });
    }
};
