export type MailProvider = {
	label: string;
	href: string;
};

const PROVIDERS: Record<string, MailProvider> = {
	"gmail.com": { label: "Gmail", href: "https://gmail.com" },
	"googlemail.com": { label: "Gmail", href: "https://gmail.com" },
	"tuta.io": { label: "Tutanota", href: "https://mail.tutanota.com" },
	"outlook.com": { label: "Outlook", href: "https://outlook.live.com" },
	"hotmail.com": { label: "Outlook", href: "https://outlook.live.com" },
	"yahoo.com": { label: "Yahoo", href: "https://mail.yahoo.com" },
	"protonmail.com": { label: "Proton Mail", href: "https://mail.proton.me" },
	"protonmail.ch": { label: "Proton Mail", href: "https://mail.proton.me" },
	"pm.me": { label: "Proton Mail", href: "https://mail.proton.me" },
	"icloud.com": { label: "iCloud Mail", href: "https://mail.icloud.com/" },
	"hey.com": { label: "HEY", href: "https://app.hey.com/" },
	"zoho.com": { label: "Zoho Mail", href: "https://mail.zoho.com/zm/" },
	"aol.com": { label: "AOL Mail", href: "https://mail.aol.com/" },
	"aim.com": { label: "AOL Mail", href: "https://mail.aol.com/" },
	"mail.com": { label: "mail.com", href: "https://www.mail.com/mail/" },
	"email.com": { label: "mail.com", href: "https://www.mail.com/mail/" },
	"wp.pl": { label: "WP Poczta", href: "https://poczta.wp.pl" },
	"seznam.cz": { label: "Seznam", href: "https://email.seznam.cz" },
	"email.cz": { label: "Seznam", href: "https://email.seznam.cz" },
	"post.cz": { label: "Seznam", href: "https://email.seznam.cz" },
	"yandex.ru": { label: "Yandex Mail", href: "https://mail.yandex.com/" },
	"yandex.com": { label: "Yandex Mail", href: "https://mail.yandex.com/" },
	"mail.ru": { label: "Mail.ru", href: "https://mail.ru/" },
	"bk.ru": { label: "Mail.ru", href: "https://mail.ru/" },
	"inbox.ru": { label: "Mail.ru", href: "https://mail.ru/" },
	"list.ru": { label: "Mail.ru", href: "https://mail.ru/" },
	"stoat.chat": { label: "Stoat Mail", href: "https://webmail.revolt.wtf" },
	"revolt.chat": { label: "Stoat Mail", href: "https://webmail.revolt.wtf" },
	"revolt.wtf": { label: "Stoat Mail", href: "https://webmail.revolt.wtf" },
};

export function mailProviderFor(email: string | null): MailProvider | null {
	if (!email) {
		return null;
	}
	const at = email.lastIndexOf("@");
	if (at < 0 || at === email.length - 1) {
		return null;
	}
	const domain = email.slice(at + 1).toLowerCase();
	const known = PROVIDERS[domain];
	if (known) {
		return known;
	}
	if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
		return null;
	}
	return { label: domain, href: `https://${domain}` };
}
