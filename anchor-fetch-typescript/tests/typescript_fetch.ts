export type TypescriptFetch = {
  "version": "0.1.0",
  "name": "typescript_fetch",
  "constants": [
    {
      "name": "PROGRAM_ID",
      "type": "string",
      "value": "\"8tKNmp7w19TCH9cvg7qTXR3etBqnofHgkTMT2ybxJ7Xx\""
    },
    {
      "name": "DEFAULT_INT_VAR",
      "type": "u16",
      "value": "30"
    }
  ],
  "instructions": [
    {
      "name": "initializeData",
      "accounts": [
        {
          "name": "data",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "errorMe",
      "accounts": [],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "data",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "intVar",
            "type": "u16"
          },
          {
            "name": "stringVar",
            "type": "string"
          },
          {
            "name": "enumVar",
            "type": {
              "defined": "DataEnum"
            }
          },
          {
            "name": "structVar",
            "type": {
              "defined": "DataStruct"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "DataStruct",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "DataEnum",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "One"
          },
          {
            "name": "Two"
          },
          {
            "name": "Three"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "DataEvent",
      "fields": [
        {
          "name": "intVar",
          "type": "u16",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ErrorMeError",
      "msg": "You get an error"
    },
    {
      "code": 6001,
      "name": "Unknown",
      "msg": "Unknown"
    }
  ]
};

export const IDL: TypescriptFetch = {
  "version": "0.1.0",
  "name": "typescript_fetch",
  "constants": [
    {
      "name": "PROGRAM_ID",
      "type": "string",
      "value": "\"8tKNmp7w19TCH9cvg7qTXR3etBqnofHgkTMT2ybxJ7Xx\""
    },
    {
      "name": "DEFAULT_INT_VAR",
      "type": "u16",
      "value": "30"
    }
  ],
  "instructions": [
    {
      "name": "initializeData",
      "accounts": [
        {
          "name": "data",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "errorMe",
      "accounts": [],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "data",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "intVar",
            "type": "u16"
          },
          {
            "name": "stringVar",
            "type": "string"
          },
          {
            "name": "enumVar",
            "type": {
              "defined": "DataEnum"
            }
          },
          {
            "name": "structVar",
            "type": {
              "defined": "DataStruct"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "DataStruct",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "DataEnum",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "One"
          },
          {
            "name": "Two"
          },
          {
            "name": "Three"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "DataEvent",
      "fields": [
        {
          "name": "intVar",
          "type": "u16",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ErrorMeError",
      "msg": "You get an error"
    },
    {
      "code": 6001,
      "name": "Unknown",
      "msg": "Unknown"
    }
  ]
};
