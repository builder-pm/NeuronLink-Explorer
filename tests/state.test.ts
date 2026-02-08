
const describe = (name: string, fn: () => void) => { console.log(`DESCRIBE: ${name}`); fn(); };
const it = (name: string, fn: () => void) => { console.log(`IT: ${name}`); fn(); };
const expect = (actual: any) => ({
  toEqual: (expected: any) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      console.error('Assertion failed:');
      console.error('Expected:', expectedStr);
      console.error('Actual:  ', actualStr);
      throw new Error(`AssertionError: Expected did not match actual.`);
    }
    console.log('Assertion passed.');
  }
});

import { appReducer, initialState } from '../state/reducer';
import { ActionType } from '../state/actions';

describe('AppState Reducer - Semantic Metadata', () => {

  it('should handle SET_FIELD_METADATA', () => {
    const action = {
      type: ActionType.SET_FIELD_METADATA as any,
      payload: {
        fieldKey: 'public.actors.first_name',
        metadata: { description: 'The first name of the actor', dataType: 'text' }
      }
    };
    const newState = appReducer(initialState, action);
    expect(newState.fieldMetadata['public.actors.first_name']).toEqual({
      description: 'The first name of the actor',
      dataType: 'text'
    });
  });

  it('should handle SET_SAMPLE_VALUES', () => {
    const action = {
      type: ActionType.SET_SAMPLE_VALUES as any,
      payload: {
        fieldKey: 'public.actors.first_name',
        values: ['PENELOPE', 'NICK', 'ED']
      }
    };
    const newState = appReducer(initialState, action);
    expect(newState.sampleValues['public.actors.first_name']).toEqual(['PENELOPE', 'NICK', 'ED']);
  });

  it('should merge metadata and sample values in LOAD_CONFIG', () => {
    const config = {
      fieldMetadata: {
        't1.c1': { description: 'Desc 1', dataType: 'dimension' }
      },
      sampleValues: {
        't1.c1': ['v1', 'v2']
      }
    };
    const action = {
      type: ActionType.LOAD_CONFIG,
      payload: config
    };
    const newState = appReducer(initialState, action);
    expect(newState.fieldMetadata['t1.c1']).toEqual({ description: 'Desc 1', dataType: 'dimension' });
    expect(newState.sampleValues['t1.c1']).toEqual(['v1', 'v2']);
  });
});
