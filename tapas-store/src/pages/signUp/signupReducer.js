import { DEFAULT_SIGNUP_STATE, isValidEmail } from '../../data/signUpConfig';
import { digitsOnly } from './cardFormat';

export { DEFAULT_SIGNUP_STATE };

export function signupReducer(state, action) {
  switch (action.type) {
    case 'SET_TIER':
      return { ...state, tier: action.tier };
    case 'GOTO_STEP':
      return { ...state, step: action.step };
    case 'PATCH_ABOUT':
      return { ...state, aboutYou: { ...state.aboutYou, ...action.patch } };
    case 'PATCH_READING':
      return { ...state, yourReading: { ...state.yourReading, ...action.patch } };
    case 'PATCH_PAYMENT':
      return { ...state, payment: { ...state.payment, ...action.patch } };
    case 'SET_CONSENT':
      return { ...state, consent: !!action.value };
    case 'TOGGLE_READING_TAG': {
      const curr = new Set(state.aboutYou.readingTags);
      // "Nothing in particular" is mutually exclusive with the rest.
      if (action.tag === 'Nothing in particular') {
        return {
          ...state,
          aboutYou: {
            ...state.aboutYou,
            readingTags: curr.has(action.tag) ? [] : ['Nothing in particular'],
          },
        };
      }
      curr.delete('Nothing in particular');
      if (curr.has(action.tag)) curr.delete(action.tag);
      else curr.add(action.tag);
      return { ...state, aboutYou: { ...state.aboutYou, readingTags: [...curr] } };
    }
    case 'TOGGLE_SPOILER': {
      const curr = new Set(state.yourReading.spoilers);
      if (curr.has(action.tag)) curr.delete(action.tag);
      else curr.add(action.tag);
      return { ...state, yourReading: { ...state.yourReading, spoilers: [...curr] } };
    }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    default:
      return state;
  }
}

export function validateStep1(s) {
  const errs = {};
  if (!s.aboutYou.firstName.trim()) errs.firstName = 'Required.';
  if (!s.aboutYou.lastName.trim())  errs.lastName  = 'Required.';
  if (!isValidEmail(s.aboutYou.email)) errs.email  = 'Check the email.';
  if (!s.aboutYou.password || s.aboutYou.password.length < 8) {
    errs.password = 'At least 8 characters.';
  }
  return errs;
}

export function validateStep3(s) {
  const errs = {};
  if (!s.payment.cardName.trim()) errs.cardName = 'Required.';
  const cn = digitsOnly(s.payment.cardNumber);
  if (cn.length < 13 || cn.length > 19) errs.cardNumber = 'Check the number.';
  const exp = digitsOnly(s.payment.expiry);
  if (exp.length < 4) errs.expiry = 'MM / YY.';
  const cv = digitsOnly(s.payment.cvc);
  if (cv.length < 3 || cv.length > 4) errs.cvc = '3\u20134 digits.';
  if (!s.payment.authorized) errs.authorized = 'Needed to charge your card.';
  if (!s.consent) errs.consent = 'Required.';
  return errs;
}
