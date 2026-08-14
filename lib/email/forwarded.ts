import iconv from "iconv-lite";

type ForwardedEmail = {
  isForwarded: boolean;

  outerSubject: string;
  outerFromName: string;
  outerFromAddress: string | null;

  originalSubject: string | null;
  originalFromName: string | null;
  originalFromAddress: string | null;
  originalSentAt: string | null;

  body: string;
};

const MOJIBAKE_MARKERS = [
  "锟",
  "鈥",
  "銆",
  "鑾",
  "鍙",
  "鏃",
  "浜",
  "绔",
  "闂",
  "甯",
  "浠",
  "绠",
  "瀹",
];

function mojibakeScore(
  text: string
) {
  return MOJIBAKE_MARKERS.reduce(
    (score, marker) =>
      score +
      (
        text.split(marker)
          .length - 1
      ),
    0
  );
}

/**
 * Some Outlook-forwarded text can contain
 * UTF-8 Chinese that was accidentally
 * interpreted as GBK/GB18030.
 *
 * Example:
 * 鑾峰彇 -> 获取
 */
export function repairMojibake(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  const original =
    value;

  if (
    mojibakeScore(original) === 0
  ) {
    return original;
  }

  try {
    const repaired =
      iconv
        .encode(
          original,
          "gb18030"
        )
        .toString("utf8");

    if (
      mojibakeScore(repaired) <
      mojibakeScore(original)
    ) {
      return repaired;
    }
  } catch {
    // Keep original text if repair fails.
  }

  return original;
}

function cleanSubject(
  subject: string
) {
  return subject
    .replace(
      /^(fw|fwd)\s*:\s*/i,
      ""
    )
    .replace(
      /^(转发|轉寄|轉發)\s*[:：]\s*/i,
      ""
    )
    .trim();
}

function parseAddress(
  value: string
) {
  const angleMatch =
    value.match(
      /^(.*?)\s*<([^<>]+)>/
    );

  if (angleMatch) {
    return {
      name:
        angleMatch[1]
          .trim()
          .replace(
            /^["']|["']$/g,
            ""
          ) || null,

      address:
        angleMatch[2]
          .trim(),
    };
  }

  const emailMatch =
    value.match(
      /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/
    );

  if (emailMatch) {
    const address =
      emailMatch[0];

    return {
      name:
        value
          .replace(
            address,
            ""
          )
          .trim() || null,

      address,
    };
  }

  return {
    name:
      value.trim() || null,
    address: null,
  };
}

function findHeader(
  text: string,
  labels: string[]
) {
  for (
    const label of labels
  ) {
    const escaped =
      label.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const regex =
      new RegExp(
        `^\\s*${escaped}\\s*[:：]\\s*(.+)$`,
        "im"
      );

    const match =
      text.match(regex);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function findBodyStart(
  text: string
) {
  const subjectRegex =
    /^\s*(Subject|主题|主旨)\s*[:：]\s*.+$/im;

  const match =
    subjectRegex.exec(text);

  if (!match) {
    return null;
  }

  const afterSubject =
    text.slice(
      match.index +
        match[0].length
    );

  return afterSubject
    .replace(
      /^[\s\r\n]+/,
      ""
    )
    .trim();
}

export function parseForwardedEmail({
  subject,
  fromName,
  fromAddress,
  body,
}: {
  subject: string;
  fromName: string;
  fromAddress: string | null;
  body: string;
}): ForwardedEmail {
  const fixedSubject =
    repairMojibake(subject);

  const fixedFromName =
    repairMojibake(fromName);

  const fixedBody =
    repairMojibake(body)
      .replace(
        /\r\n/g,
        "\n"
      );

  const originalFrom =
    findHeader(
      fixedBody,
      [
        "From",
        "发件人",
        "寄件者",
      ]
    );

  const originalSubject =
    findHeader(
      fixedBody,
      [
        "Subject",
        "主题",
        "主旨",
      ]
    );

  const originalSentAt =
    findHeader(
      fixedBody,
      [
        "Sent",
        "Date",
        "发送时间",
        "寄件日期",
      ]
    );

  const parsedFrom =
    originalFrom
      ? parseAddress(
          originalFrom
        )
      : {
          name: null,
          address: null,
        };

  const extractedBody =
    findBodyStart(
      fixedBody
    );

  const looksForwarded =
    Boolean(
      originalFrom &&
        originalSubject &&
        extractedBody
    );

  return {
    isForwarded:
      looksForwarded,

    outerSubject:
      fixedSubject,

    outerFromName:
      fixedFromName,

    outerFromAddress:
      fromAddress,

    originalSubject:
      originalSubject
        ? repairMojibake(
            originalSubject
          )
        : null,

    originalFromName:
      parsedFrom.name
        ? repairMojibake(
            parsedFrom.name
          )
        : null,

    originalFromAddress:
      parsedFrom.address,

    originalSentAt:
      originalSentAt
        ? repairMojibake(
            originalSentAt
          )
        : null,

    body:
      extractedBody ||
      fixedBody,
  };
}

export function getDisplaySubject(
  email: ForwardedEmail
) {
  return (
    email.originalSubject ||
    cleanSubject(
      email.outerSubject
    )
  );
}

export function getDisplaySender(
  email: ForwardedEmail
) {
  return {
    name:
      email.originalFromName ||
      email.outerFromName,

    address:
      email.originalFromAddress ||
      email.outerFromAddress,
  };
}