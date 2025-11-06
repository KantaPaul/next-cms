import { MESSAGES } from '@/config/messages';
import { type ServerError } from '@/lib/utils/error';

interface UniqueConstraintErrorDetails {
  constraintName: string;
  duplicateValues: Record<string, any>;
  originalError: any;
}

class PostgresErrorHandler {
  /**
   * Unique constraint error code
   */
  private static readonly UNIQUE_CONSTRAINT_ERROR_CODE = '23505';

  /**
   * Required field missing error code
   */
  private static readonly REQUIRED_FIELD_MISSING_ERROR_CODE = '23502';

  /**
   * Foreign key violation error code
   */
  private static readonly FOREIGN_KEY_VIOLATION_ERROR_CODE = '23503';

  /**
   * Value does not meet criteria error code
   */
  private static readonly VALUE_DOES_NOT_MEET_CRITERIA_ERROR_CODE = '23514';

  /**
   * Conflicting value error code
   */
  private static readonly CONFLICTING_VALUE_ERROR_CODE = '23P01';

  /**
   * Input too long error code
   */
  private static readonly INPUT_TOO_LONG_ERROR_CODE = '22001';

  /**
   * Input out of range error code
   */
  private static readonly INPUT_OUT_OF_RANGE_ERROR_CODE = '22003';

  /**
   * Invalid input format error code
   */
  private static readonly INVALID_INPUT_FORMAT_ERROR_CODE = '22P02';

  /**
   * Table not found error code
   */
  private static readonly TABLE_NOT_FOUND_ERROR_CODE = '42P01';

  private static readonly MESSAGE = {
    UNIQUE_CONSTRAINT_ERROR_MESSAGE:
      'The value provided already exists. Please use a different value.',
    REQUIRED_FIELD_MISSING_ERROR_MESSAGE:
      'A required field is missing. Please provide all required information.',
    FOREIGN_KEY_VIOLATION_ERROR_MESSAGE:
      'Could not complete operation because it is linked to other data. {value} is not exist.',
    VALUE_DOES_NOT_MEET_CRITERIA_ERROR_MESSAGE:
      'The value provided does not meet the required criteria. Please check and try again.',
    CONFLICTING_VALUE_ERROR_MESSAGE:
      'The provided value conflicts with an existing record. Please modify your input.',
    INPUT_TOO_LONG_ERROR_MESSAGE:
      'The input is too long. Please shorten it to fit the allowed length.',
    INPUT_OUT_OF_RANGE_ERROR_MESSAGE:
      'The number provided is out of the acceptable range. Please adjust it.',
    INVALID_INPUT_FORMAT_ERROR_MESSAGE:
      'The input format is invalid. Please use the correct format.',
    TABLE_NOT_FOUND_ERROR_MESSAGE: 'The table does not exist. Please check the table name.',
  };

  /**
  /**
   * Checks if the error is a unique constraint violation
   * @param error - The error object from PostgreSQL
   * @returns Boolean indicating if it's a unique constraint error
   */
  static isUniqueConstraintError(error: any): boolean {
    return error?.code === this.UNIQUE_CONSTRAINT_ERROR_CODE;
  }

  /**
   * Extracts detailed information from a unique constraint error
   * @param error - The error object from PostgreSQL
   * @returns Detailed information about the unique constraint violation
   */
  static parseUniqueConstraintError(error: any): UniqueConstraintErrorDetails | null {
    if (!this.isUniqueConstraintError(error)) {
      return null;
    }

    return this.generateErrorDetails(error);
  }

  static generateErrorDetails(error: any): UniqueConstraintErrorDetails {
    const constraintName = error.constraint || 'unknown_constraint';
    const duplicateValues: Record<string, any> = {};

    // Try to parse the detail message
    if (error.detail) {
      const matchValues = error.detail.match(/Key \((.*?)\)=\((.*?)\)/);

      if (matchValues) {
        const keys = matchValues[1].split(', ');
        const values = matchValues[2].split(', ');

        keys.forEach((key: string, index: number) => {
          if (key !== 'team_id') duplicateValues[key.trim()] = values[index]?.trim();
        });
      }
    }

    return {
      constraintName,
      duplicateValues,
      originalError: error,
    };
  }

  /**
   * Generates a user-friendly error message
   * @param errorDetails - The parsed unique constraint error details
   * @returns A human-readable error message
   */
  static formatErrorMessage(errorDetails: UniqueConstraintErrorDetails | null): string {
    if (!errorDetails) {
      return '';
    }

    const valueStrings = Object.entries(errorDetails.duplicateValues)
      .filter(([key]) => key !== 'team_id')
      .map(([key, value]) => `${key.replace('_id', '')} : ${value}`)
      .join(', ');

    return `${valueStrings}`;
  }

  /**
   * Handles unique constraint errors with optional custom handling
   * @param error - The error object from PostgreSQL
   * @param customHandler - Optional custom error handling function
   * @returns Processed error details or null
   */
  static handle(
    error: any,
    customHandler?: (errorDetails: UniqueConstraintErrorDetails) => void
  ): UniqueConstraintErrorDetails | null {
    if (!this.isUniqueConstraintError(error)) {
      return null;
    }

    const errorDetails = this.parseUniqueConstraintError(error);

    if (errorDetails) {
      // Optional custom error handling
      if (customHandler) {
        customHandler(errorDetails);
      }

      // Log the error
      console.error(this.formatErrorMessage(errorDetails));
    }

    return errorDetails;
  }

  /**
   * Provides a user-friendly message for a given PostgreSQL error
   * @param error - The error object from PostgreSQL
   * @returns A user-friendly error message or a default message
   */
  static getUserFriendlyMessage(error: any): ServerError {
    let message: string = MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_LATER;
    let errorType: ServerError['errorType'] = 'ApplicationException';

    let errorDetails: UniqueConstraintErrorDetails | null = null;

    // Handle other PostgreSQL error codes
    switch (error?.code) {
      case this.UNIQUE_CONSTRAINT_ERROR_CODE:
        errorDetails = this.parseUniqueConstraintError(error);
        message = `The value provided already exists. Please use a different value. ${this.formatErrorMessage(errorDetails)}`;
        break;

      case this.REQUIRED_FIELD_MISSING_ERROR_CODE:
        message = this.MESSAGE.REQUIRED_FIELD_MISSING_ERROR_MESSAGE;
        break;

      case this.FOREIGN_KEY_VIOLATION_ERROR_CODE:
        errorDetails = this.generateErrorDetails(error);
        message = `Unable to complete operation - the referenced ${this.formatErrorMessage(errorDetails)} does not exist in the database. Please verify the reference and try again.`;
        break;

      case this.VALUE_DOES_NOT_MEET_CRITERIA_ERROR_CODE:
        message = this.MESSAGE.VALUE_DOES_NOT_MEET_CRITERIA_ERROR_MESSAGE;
        break;

      case this.CONFLICTING_VALUE_ERROR_CODE:
        message = this.MESSAGE.CONFLICTING_VALUE_ERROR_MESSAGE;
        break;

      case this.INPUT_TOO_LONG_ERROR_CODE:
        message = this.MESSAGE.INPUT_TOO_LONG_ERROR_MESSAGE;
        break;

      case this.INPUT_OUT_OF_RANGE_ERROR_CODE:
        message = this.MESSAGE.INPUT_OUT_OF_RANGE_ERROR_MESSAGE;
        break;

      case this.INVALID_INPUT_FORMAT_ERROR_CODE:
        message = this.MESSAGE.INVALID_INPUT_FORMAT_ERROR_MESSAGE;
        break;

      case this.TABLE_NOT_FOUND_ERROR_CODE:
        message =
          process.env.NODE_ENV === 'development'
            ? this.MESSAGE.TABLE_NOT_FOUND_ERROR_MESSAGE
            : MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_LATER;
        break;

      default:
        message = MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_LATER;
        errorType = 'Error';
        break;
    }

    return { hasError: true, message, errorType };
  }
}

export default PostgresErrorHandler;
