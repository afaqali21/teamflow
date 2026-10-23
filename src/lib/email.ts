import { Resend } from "resend";

type PasswordEmail = {
  to: string;
  url: string;
  reason: "invite" | "reset";
};

export async function sendPasswordEmail(input: PasswordEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured.");
    }
    console.info(`Password ${input.reason} link for ${input.to}: ${input.url}`);
    return { delivered: false as const };
  }

  const resend = new Resend(apiKey);
  const subject =
    input.reason === "invite" ? "Set your Teamflow password" : "Reset your Teamflow password";
  const intro =
    input.reason === "invite"
      ? "An administrator created a Teamflow account for you."
      : "We received a request to reset your Teamflow password.";
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `${intro}\n\nThis link expires in 48 hours:\n${input.url}\n\nIf you did not expect this email, you can ignore it.\n`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { delivered: true as const };
}

export async function sendNoticeEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Notice email for ${input.to}: ${input.subject}`);
    } else {
      console.error("Notice email is not configured.");
    }
    return { delivered: false as const };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    if (error) {
      console.error("Notice email failed.", error.message);
      return { delivered: false as const };
    }
  } catch (error) {
    console.error("Notice email failed.", error);
    return { delivered: false as const };
  }

  return { delivered: true as const };
}

/** @deprecated Use sendNoticeEmail */
export async function sendAssignmentEmail(input: { to: string; subject: string; text: string }) {
  return sendNoticeEmail(input);
}
