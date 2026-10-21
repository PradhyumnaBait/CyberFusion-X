package com.cyberfusionx.forensics;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Citizen guidance content: "what happens next", do-this-now checklist and safety
 * tips per scam type. Static, reviewable content (no AI generation) so advice is
 * always safe and consistent. English first; hi/mr translations come with i18n.
 */
public final class GuidanceService {

    private GuidanceService() {}

    public static Map<String, Object> guidanceFor(String scamType) {
        String type = scamType != null ? scamType : "OTHER";
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scamType", type);
        out.put("emergency", Map.of(
                "title", "Lost money in the last few hours?",
                "text", "Call 1930 right now (national cyber-fraud helpline, 24x7). They can try to hold the money in the fraudster's bank account. Then complete the official complaint at cybercrime.gov.in. Do not wait to finish this form first.",
                "helpline", "1930",
                "portal", "https://cybercrime.gov.in",
                "statePortal", "https://mhcyber.gov.in/report-complaint"));
        out.put("nextSteps", List.of(
                "Your complaint and evidence files are digitally sealed with a SHA-256 fingerprint, so any later change can be detected.",
                "An officer reviews the priority queue. Fresh money-loss cases are reviewed first because banks can sometimes hold the money.",
                "If a destination account is identified, the officer can send a hold/freeze intimation to the bank with your transaction reference.",
                "You can track progress any time on the Track page using your complaint number and tracking code.",
                "You may be asked for more information. Keep the original chats, receipts and call logs safe.",
                "This demo system's complaint number is its own reference. It is not an NCRP acknowledgement number and not an FIR."
        ));
        out.put("checklist", switch (type) {
            case "UPI_PAYMENT_FRAUD" -> List.of(
                    "Call 1930 now if you have not already — every hour matters.",
                    "Call your bank: dispute the transaction and ask to block UPI/debit card if details were shared.",
                    "Take screenshots of the chat, the payment receipt (with UPI Ref/UTR number) and the call log.",
                    "Do NOT pay anyone who claims they can 'recover' your money for a fee — that is a second scam.",
                    "Change your UPI PIN and banking passwords from a safe device.");
            case "FAKE_JOB_INVESTMENT" -> List.of(
                    "Stop all further 'task', 'fee' or 'tax' payments — real employers never ask for money to release salary.",
                    "Screenshot the Telegram/WhatsApp group, member list and payment receipts before the group is deleted.",
                    "Call your bank and 1930 if the payment was recent.",
                    "Report the group/account inside the app where you were contacted.",
                    "Tell family members — the same group often targets many people.");
            case "HARASSMENT_THREATS" -> List.of(
                    "Do not pay anything and do not delete the messages or call logs.",
                    "Screenshot the threats with the sender's number visible.",
                    "Block the number after saving evidence; report it as spam in your phone app.",
                    "If anyone claims to be police/customs on a video call ('digital arrest'), disconnect — real police never arrest on video call or demand money.",
                    "If you feel unsafe, contact your local police station or dial 112.");
            case "ACCOUNT_HACKED" -> List.of(
                    "Change the account password immediately from a device you trust, then enable 2-factor authentication.",
                    "Log out of all other sessions from the account's security settings.",
                    "Check 'sent' folders — the hacker may have messaged your contacts; warn them.",
                    "If money moved, call your bank and 1930.",
                    "Review which apps/websites have access and remove unknown ones.");
            case "PHISHING_LINK" -> List.of(
                    "If you entered bank/card details or an OTP, call your bank right now and block the card/account.",
                    "Change passwords for any account whose details you entered, starting with email and banking.",
                    "Do not open the link again; keep the message containing the link as evidence.",
                    "Run a security scan on your phone and remove apps installed from links sent by strangers.",
                    "Enable 2-factor authentication on important accounts.");
            default -> List.of(
                    "Save all messages, receipts, screenshots and call logs — do not delete anything.",
                    "If money was lost recently, call 1930 and your bank immediately.",
                    "Change passwords for accounts you shared details about, and enable 2-factor authentication.",
                    "Do not engage further with the suspect; block after saving evidence.");
        });
        out.put("safetyTips", switch (type) {
            case "UPI_PAYMENT_FRAUD" -> List.of(
                    "Banks never ask you to pay money to 'verify KYC' or 'unfreeze' an account.",
                    "Receiving money never needs a UPI PIN — if asked for a PIN to receive, it is a scam.",
                    "Check the name shown before paying any UPI ID/QR code.",
                    "Type your bank's website yourself; never use links from SMS/WhatsApp.");
            case "FAKE_JOB_INVESTMENT" -> List.of(
                    "Real jobs do not charge registration, training or 'release' fees.",
                    "'Earn Rs. 5,000/day for liking videos' is always a scam script.",
                    "Verify companies on their official website and official email domain.",
                    "Screenshots of 'profits' shown by strangers are fake and easy to make.");
            case "HARASSMENT_THREATS" -> List.of(
                    "There is no such thing as 'digital arrest' — police do not interrogate or arrest on video calls.",
                    "Customs/courier officers never demand payment on phone calls.",
                    "Urgency and secrecy ('do not tell anyone') are the scammer's main tools — slow down and verify with family.",
                    "Use your phone's spam-reporting so carriers can block repeat numbers.");
            case "ACCOUNT_HACKED" -> List.of(
                    "Use a different strong password for every important account.",
                    "Turn on 2-factor authentication everywhere it is offered.",
                    "Never share OTPs — no bank, company or officer will ever ask for one.",
                    "Review logged-in devices in your accounts once a month.");
            case "PHISHING_LINK" -> List.of(
                    "Look at the actual domain: extra words or endings like .top/.xyz after a bank name mean it is fake.",
                    "Government and bank sites in India use .gov.in / official bank domains.",
                    "Shortened links (bit.ly etc.) hide the destination — treat them with suspicion.",
                    "Urgent threats ('account blocked in 15 minutes') are designed to stop you thinking.");
            default -> List.of(
                    "Never share OTPs, PINs or passwords with anyone on call or message.",
                    "Verify urgent money requests by calling the person/bank on a number you already trust.",
                    "Keep your phone and apps updated.",
                    "Discuss any unexpected money request with family before paying.");
        });
        return out;
    }
}
