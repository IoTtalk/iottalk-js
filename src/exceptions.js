/* eslint max-classes-per-file: ["error", 42] */

class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ArgumentError extends CustomError { }

export class RegistrationError extends CustomError { }
