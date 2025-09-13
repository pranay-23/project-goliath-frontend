import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormSanitizationService {

  /**
   * Checks if the parsed document's body contains any element nodes.
   * @param doc The Document object parsed by DOMParser.
   * @returns True if element nodes are found in the body, false otherwise.
   */
  private hasHtmlElementNodes(doc: Document): boolean {
    // DOMParser().parseFromString(..., 'text/html') always creates a full HTML document
    // with <html>, <head>, and <body>. So, doc.body should always exist.
    return Array.from(doc?.body?.childNodes ?? []).some(
      node => node.nodeType === Node.ELEMENT_NODE
    );
  }

  /**
   * Attempts to detect potentially harmful content in a string.
   * Note: This service DETECTS issues and flags an error. It does NOT clean or truly sanitize the input.
   * The 'sanitized' property in the return value is the original input string.
   * Blacklist-based detection can be bypassed and should be part of a defense-in-depth strategy,
   * with primary validation and sanitization performed server-side.
   * @param input The string to inspect.
   * @returns An object with the original input string and an error flag.
   */
  public sanitizeInput(input: string): { sanitized: string, error: boolean } {
    if (!input || input.trim() === '') {
      return { sanitized: '', error: false };
    }
    
    let error = false;
    // Parse the input string as HTML. This is done once for efficiency.
    const doc = new DOMParser().parseFromString(input, 'text/html');

    // 1. Check if the input, when parsed as HTML, contains any actual HTML element nodes.
    // This is a general check for HTML content in an input field that might expect plain text.
    if (this.hasHtmlElementNodes(doc)) {
      error = true;
    }

    /**
     * An array of regular expressions to detect potentially dangerous patterns in strings.
     * Note: While useful for basic checks, using regex is not a foolproof method
     * for preventing complex XSS attacks. Always use a dedicated sanitization library.
     */
    const dangerousPatterns = [
      /<script>/gi,
      /<script\b[^<](?:(?!<\/script>)<[^<])*<\/script>/gi,
      /javascript:/gi,
      // /on\w+\s*=/gi,
      /href+\s*=/gi,
      /src+\s*=/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /alert\s*\(/gi,
      /setInterval\s*\(/gi,
      /document\.write\s*\(/gi,
      /<[^>][a-z0-9][^>]>/gi,
      /<\s*(?![a-zA-Z]+\s+[a-zA-Z]+>)(\/)?[a-zA-Z0-9]+(\s+[^<>])?>\s/,
      /function\s*(\w+)?\s*\([^)]\)\s\{[\s\S]*?\}/gi,
      /\bwindow\s*\.\s*location\b/gi,
      /\b(window\s*\.\slocation|window\s*\.\slocalStorage\s\.\ssetItem|localStorage\s\.\s*setItem)\b/gi,
      /\b(window\s*\.\slocation|window\s*\.\slocalStorage\s\.\sdeleteItem|localStorage\s\.\s*deleteItem)\b/gi,
      /\b(window\s*\.\slocation|window\s*\.\slocalStorage\s\.\sgetItem|localStorage\s\.\s*getItem)\b/gi,
      /fetch\s*\(/gi,
    ];
    
    // Use textContent from the body of the parsed document.
    // This can help find scripts that might be de-obfuscated or appear as plain text within HTML.
    const textContent = doc.body ? (doc.body.textContent ?? "") : "";

    for (const pattern of dangerousPatterns) {
      if (error) { // Optimization: if an error is already flagged, no need to check more patterns.
        break;
      }

      // Test pattern against the original raw input string.
      // This is crucial for detecting patterns in attributes or HTML structure.
      if (pattern.test(input)) {
        error = true;
        continue; // Go to next iteration or break if error is already set
      }

      // Optionally, test against the extracted textContent.
      // This might catch different things (e.g., script content without tags).
      // Be aware that textContent strips all tags.
      if (textContent && pattern.test(textContent)) {
        error = true;
      }
    }

    // IMPORTANT: The service currently only DETECTS. It does not CLEAN the input.
    // The 'sanitized' field returns the original input.
    // To actually sanitize, the commented-out .replace() lines in your original code
    // (or more robust sanitization logic) would need to be implemented.
    return { sanitized: input, error };
  }
}