import { Options, minify } from 'html-minifier';
import { TemplatePart } from 'parse-literals';

/**
 * A strategy on how to minify HTML.
 */
export interface Strategy<O = any> {
  /**
   * Retrieve a placeholder for the given array of template parts. The
   * placeholder returned should be the same if the function is invoked with the
   * same array of parts.
   *
   * The placeholder should be an HTML-compliant string that is not present in
   * any of the parts' text.
   *
   * @param parts the parts to get a placeholder for
   * @returns the placeholder
   */
  getPlaceholder(parts: TemplatePart[]): string;
  /**
   * Combines the parts' HTML text strings together into a single string using
   * the provided placeholder. The placeholder indicates where a template
   * expression occurs.
   *
   * @param parts the parts to combine
   * @param placeholder the placeholder to use between parts
   * @returns the combined parts' text strings
   */
  combineHTMLStrings(parts: TemplatePart[], placeholder: string): string;
  /**
   * Minfies the provided HTML string.
   *
   * @param html the html to minify
   * @param options minify options
   * @returns minified HTML string
   */
  minifyHTML(html: string, options?: O): string;
  /**
   * Splits a minfied HTML string back into an array of strings from the
   * provided placeholder. The returned array of strings should be the same
   * length as the template parts that were combined to make the HTML string.
   *
   * @param html the html string to split
   * @param placeholder the placeholder to split by
   * @returns an array of html strings
   */
  splitHTMLByPlaceholder(html: string, placeholder: string): string[];
}

/**
 * The default <code>html-minifier</code> options, optimized for production
 * minification.
 */
export const defaultMinifyOptions: Options = {
  caseSensitive: true,
  collapseWhitespace: true,
  decodeEntities: true,
  minifyCSS: true,
  minifyJS: true,
  processConditionalComments: true,
  removeAttributeQuotes: true,
  removeComments: true,
  removeEmptyAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true
};

/**
 * The default strategy. This uses <code>html-minifier</code> to minify HTML.
 */
export const defaultStrategy: Strategy<Options> = {
  getPlaceholder(parts) {
    // Using @ and (); will cause the expression not to be removed in CSS.
    // However, sometimes the semicolon can be removed (ex: inline styles).
    // In those cases, we want to make sure that the HTML splitting also
    // accounts for the missing semicolon.
    const suffix = '();';
    let placeholder = '@TEMPLATE_EXPRESSION';
    while (parts.some(part => part.text.includes(placeholder + suffix))) {
      placeholder += '_';
    }

    return placeholder + suffix;
  },
  combineHTMLStrings(parts, placeholder) {
    return parts.map(part => part.text).join(placeholder);
  },
  minifyHTML(html, options = {}) {
    let minifyCSSOptions: any;
    if (options.minifyCSS) {
      if (
        options.minifyCSS !== true &&
        typeof options.minifyCSS !== 'function'
      ) {
        minifyCSSOptions = { ...options.minifyCSS };
      } else {
        minifyCSSOptions = {};
      }
    } else {
      minifyCSSOptions = false;
    }

    if (minifyCSSOptions && typeof minifyCSSOptions.level === 'undefined') {
      minifyCSSOptions.level = {
        1: {
          transform(_property: string, value: string) {
            if (
              value.startsWith('@TEMPLATE_EXPRESSION') &&
              !value.endsWith(';')
            ) {
              // The CSS minifier has removed the semicolon from the placeholder
              // and we need to add it back.
              return `${value};`;
            }
          }
        }
      };
    }

    return minify(html, {
      ...options,
      minifyCSS: minifyCSSOptions
    });
  },
  splitHTMLByPlaceholder(html, placeholder) {
    // Make the last character (a semicolon) optional. See above.
    // return html.split(new RegExp(`${placeholder}?`, 'g'));
    return html.split(placeholder);
  }
};
