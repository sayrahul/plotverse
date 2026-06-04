/**
 * Enquiry form validation (task 9.1) — pure, framework-free.
 *
 * The Plot_Detail_Sheet enquiry form lets a Public_Viewer submit a name,
 * contact, and message that become a {@link Lead}. Before submission, the input
 * must be validated: if it is invalid the Project_Viewer displays validation
 * messages and withholds submission until the input is valid (Req 20.3).
 *
 * This module exposes a single pure {@link validateEnquiry} function over an
 * {@link EnquiryFormInput}. It returns a typed {@link EnquiryValidationError}
 * array. An empty array means the input is valid and submission may proceed; a
 * non-empty array means submission must be withheld until the problems are
 * resolved.
 *
 * The validity rule (Property 25) is: the input is valid **if and only if** all
 * required fields (name, contact, message) are present (non-empty after
 * trimming) AND the contact is well-formed — either a valid email address or a
 * phone number with enough digits to dial.
 *
 * Requirements: 20.3
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The raw fields captured by the enquiry form (Req 20.1). */
export interface EnquiryFormInput {
  name: string;
  contact: string;
  message: string;
}

/** The form fields that can carry a validation error. */
export type EnquiryField = "name" | "contact" | "message";

/**
 * A single, human-presentable validation problem tied to the field that caused
 * it, so the Plot_Detail_Sheet can render field-level messages (Req 20.3).
 */
export interface EnquiryValidationError {
  field: EnquiryField;
  message: string;
}

// ---------------------------------------------------------------------------
// Contact well-formedness
// ---------------------------------------------------------------------------

/**
 * Minimum number of digits a phone number must contain to be considered
 * dialable. Seven covers the shortest local subscriber numbers while rejecting
 * stray digit fragments.
 */
const MIN_PHONE_DIGITS = 7;

/**
 * Pragmatic email shape: a non-empty local part, an `@`, a domain with at least
 * one dot, and no whitespace. This is intentionally lenient — full RFC 5322
 * validation is neither necessary nor desirable for a contact field — while
 * still rejecting obviously malformed addresses.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Characters allowed in a phone number alongside its digits: spaces, a leading
 * `+`, and common grouping punctuation. A value that is "phone-like" must
 * consist solely of these characters plus digits, and contain enough digits.
 */
const PHONE_ALLOWED_PATTERN = /^[+\d().\-\s]+$/;

/** True iff `value` is a syntactically plausible email address. */
function isWellFormedEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/**
 * True iff `value` is a plausible phone number: it contains only digits and
 * common phone punctuation, and has at least {@link MIN_PHONE_DIGITS} digits.
 */
function isWellFormedPhone(value: string): boolean {
  if (!PHONE_ALLOWED_PATTERN.test(value)) return false;
  const digitCount = (value.match(/\d/g) ?? []).length;
  return digitCount >= MIN_PHONE_DIGITS;
}

/**
 * True iff a (trimmed) contact value is well-formed — accepted as either a
 * valid email address or a dialable phone number (Req 20.3).
 */
export function isWellFormedContact(contact: string): boolean {
  const trimmed = contact.trim();
  if (trimmed.length === 0) return false;
  return isWellFormedEmail(trimmed) || isWellFormedPhone(trimmed);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** True iff a required text field has content after trimming surrounding space. */
function isPresent(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validates an enquiry form submission (Req 20.3).
 *
 * Returns an empty array if and only if the input is valid: `name` and
 * `message` are present (non-empty after trimming) and `contact` is present and
 * well-formed (a valid email or phone number). Any failing rule contributes one
 * {@link EnquiryValidationError}, so invalid input always yields a non-empty
 * list and the caller must withhold submission until it is empty.
 *
 * The `contact` field reports at most one error: a "required" message when it is
 * blank, otherwise a "well-formed" message when it is present but malformed.
 */
export function validateEnquiry(
  input: EnquiryFormInput,
): EnquiryValidationError[] {
  const errors: EnquiryValidationError[] = [];

  if (!isPresent(input.name)) {
    errors.push({ field: "name", message: "Name is required." });
  }

  if (!isPresent(input.contact)) {
    errors.push({ field: "contact", message: "Contact information is required." });
  } else if (!isWellFormedContact(input.contact)) {
    errors.push({
      field: "contact",
      message: "Enter a valid email address or phone number.",
    });
  }

  if (!isPresent(input.message)) {
    errors.push({ field: "message", message: "Message is required." });
  }

  return errors;
}

/**
 * Convenience predicate: `true` iff the input passes validation with no errors.
 * Submission proceeds only when this returns `true` (Req 20.3).
 */
export function isValidEnquiry(input: EnquiryFormInput): boolean {
  return validateEnquiry(input).length === 0;
}
