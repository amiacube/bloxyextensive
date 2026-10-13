// ===================================================================================
// SECTION 1: CORE ENCODING UTILITIES (MODIFIED TO REMOVE BigInt)
// ===================================================================================

const ENCODING_BASE = 55203;
const ENCODING_BASE_CHAR_CODE = 0x005D;
// MAX_CAPACITY is small enough to fit in a standard JavaScript Number.
const MAX_CAPACITY = ENCODING_BASE * ENCODING_BASE;

/**
 * Calculates the total number of unique strings up to a given length.
 * This version uses standard Numbers and includes an overflow check against maxCapacity.
 * If the total would exceed maxCapacity, it returns Infinity.
 * @param {number} alphabetSize - The number of characters in the alphabet.
 * @param {number} length - The maximum length of strings to count.
 * @param {number} maxCapacity - The upper bound for the total.
 * @returns {number} The total number of strings, or Infinity if it exceeds maxCapacity.
 */
function calculateTotalStrings(alphabetSize, length, maxCapacity) {
    if (alphabetSize <= 0 || length <= 0) return 0;
    if (alphabetSize === 1) return length > maxCapacity ? Infinity : length;

    // The formula for the sum of a geometric series is a(r^n - 1) / (r - 1).
    // We compute it iteratively to avoid large intermediate values from Math.pow() that could overflow.
    let total = 0;
    let powerOfSize = alphabetSize; // Starts with strings of length 1

    for (let i = 1; i <= length; i++) {
        // Add the count of strings for the current length
        total += powerOfSize;

        // Check for overflow before calculating the next power
        if (total > maxCapacity) {
            return Infinity;
        }

        // Prepare for the next iteration (strings of length i + 1)
        // and check if the next power itself will overflow.
        if (i < length) {
            if (powerOfSize > maxCapacity / alphabetSize) {
                return Infinity; // Multiplying would cause overflow
            }
            powerOfSize *= alphabetSize;
        }
    }
    return total;
}


/**
 * Finds the maximum possible chunk length for a given alphabet size.
 * This version uses standard Numbers.
 * @param {number} alphabetSize
 * @param {number} maxCapacity
 * @returns {number} The maximum length (L_max).
 */
function findMaxPossibleLength(alphabetSize, maxCapacity) {
    if (alphabetSize <= 1) return maxCapacity;
    // Use a reasonable upper bound for the binary search. 2000 is very safe.
    let low = 1, high = 2000, maxLen = 0;
    while (low <= high) {
        // Use Math.floor for integer division
        const mid = low + Math.floor((high - low) / 2);
        if (mid === 0) break;

        // Use the safe version of calculateTotalStrings
        const total = calculateTotalStrings(alphabetSize, mid, maxCapacity);

        if (total <= maxCapacity) {
            maxLen = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return maxLen;
}

// Encodes a numerical index into a 2-character Unicode string.
function encodeIndexToUnicode(index) {
    // Math.floor is used for integer division with Numbers
    const digit1 = Math.floor(index / ENCODING_BASE);
    const digit2 = index % ENCODING_BASE;
    const char1 = String.fromCodePoint(ENCODING_BASE_CHAR_CODE + digit1);
    const char2 = String.fromCodePoint(ENCODING_BASE_CHAR_CODE + digit2);
    return char1 + char2;
}

// Decodes a 2-character Unicode string back to its numerical index.
function decodeUnicodeToIndex(payload) {
    const digit1 = payload.codePointAt(0) - ENCODING_BASE_CHAR_CODE;
    const digit2 = payload.codePointAt(1) - ENCODING_BASE_CHAR_CODE;
    return digit1 * ENCODING_BASE + digit2;
}


// ===================================================================================
// SECTION 2: SPECIALIZED ID ENCODER (FIXED ALPHABET, MODIFIED TO REMOVE BigInt)
// ===================================================================================

// The alphabet for the IDs is fixed, known, and sorted for consistency.
const ID_ALPHABET_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
const ID_ALPHABET = Array.from(new Set(ID_ALPHABET_CHARS)).sort().join('');

/**
 * A static, pre-configured codec for handling strings composed of the ID_ALPHABET.
 * It calculates its optimal chunk size (L_max) once upon initialization.
 */
const IdCodec = (() => {
    const alphabet = ID_ALPHABET;
    const alphabetSize = alphabet.length;
    // The map now stores standard Numbers for indices
    const charMap = new Map(alphabet.split('').map((char, i) => [char, i]));

    // L_max and totalStrings are now standard Numbers
    const L_max = findMaxPossibleLength(alphabetSize, MAX_CAPACITY);
    const totalStrings = calculateTotalStrings(alphabetSize, L_max, MAX_CAPACITY);

    if (L_max === 0) {
        throw new Error("The predefined alphabet is too large for the encoding capacity.");
    }

    return {
        alphabet,
        alphabetSize,
        L_max,
        totalStrings,
        /**
         * Converts a string chunk into its unique numerical index.
         * @param {string} str - A string chunk (must be <= L_max).
         * @returns {number} The numerical index.
         */
        getIndexByString(str) {
            const len = str.length;
            if (len === 0 || len > this.L_max) throw new Error(`String "${str}" (length ${len}) is invalid.`);

            // Calculate the offset for all strings shorter than the current one.
            const baseOffset = (len > 1) ? calculateTotalStrings(this.alphabetSize, len - 1, MAX_CAPACITY) : 0;

            let positionInLengthGroup = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (!charMap.has(char)) throw new Error(`Invalid character "${char}" not in ID alphabet.`);
                // Use Math.pow for exponentiation with Numbers
                const power = str.length - 1 - i;
                positionInLengthGroup += charMap.get(char) * (Math.pow(this.alphabetSize, power));
            }
            return baseOffset + positionInLengthGroup;
        },
        /**
         * Converts a numerical index back to its original string chunk.
         * @param {number} index - The numerical index.
         * @returns {string} The original string chunk.
         */
        getStringByIndex(index) {
            if (index < 0 || index >= this.totalStrings) throw new Error(`Index ${index} is out of bounds.`);

            let length = 1;
            let baseOffset = 0;
            // Find the correct length of the string for the given index
            while (true) {
                // Since length <= L_max, Math.pow will not overflow here.
                const countForLength = Math.pow(this.alphabetSize, length);
                if (index < baseOffset + countForLength) break;
                baseOffset += countForLength;
                length++;
            }

            let positionInLengthGroup = index - baseOffset;
            let result = '';
            for (let i = length - 1; i >= 0; i--) {
                const power = Math.pow(this.alphabetSize, i);
                // Use Math.floor for integer division
                const charIndex = Math.floor(positionInLengthGroup / power);
                result += this.alphabet[charIndex];
                positionInLengthGroup %= power;
            }
            return result;
        }
    };
})();

/**
 * Encodes a long string of concatenated IDs using the predefined ID_ALPHABET.
 * The output contains *only* the encoded data, with no header.
 * @param {string} longIdString - The string to encode.
 * @returns {string} The encoded Unicode payload.
 */
function encodeIds(longIdString) {
    const L_max = IdCodec.L_max; // L_max is now a Number
    if (L_max === 0) throw new Error("Cannot encode: Codec not initialized correctly.");

    let unicodePayloads = "";
    for (let i = 0; i < longIdString.length; i += L_max) {
        const chunk = longIdString.substring(i, i + L_max);
        const index = IdCodec.getIndexByString(chunk);
        unicodePayloads += encodeIndexToUnicode(index);
    }
    return unicodePayloads;
}

/**
 * Decodes a Unicode payload that was created with encodeIds.
 * Assumes the payload was encoded using the predefined ID_ALPHABET.
 * @param {string} encodedPayload - The Unicode payload to decode.
 * @returns {string} The original long string of concatenated IDs.
 */
function decodeIds(encodedPayload) {
    let decodedString = "";
    // The payload is processed in 2-character chunks, as this is the fixed
    // output size of encodeIndexToUnicode.
    for (let i = 0; i < encodedPayload.length; i += 2) {
        const payloadChunk = encodedPayload.substring(i, i + 2);
        const index = decodeUnicodeToIndex(payloadChunk);
        decodedString += IdCodec.getStringByIndex(index);
    }
    return decodedString;
}


// ===================================================================================
// SECTION 3: SPECIALIZED ENCODER TEST
// ===================================================================================



function generateCombinedIds() {
    const chars = ID_ALPHABET_CHARS;
    const idLength = 21;
    const totalIds = 56; // 56 * 21 = 1176 characters
    let result = '';

    for (let i = 0; i < totalIds; i++) {
        let id = '';
        for (let j = 0; j < idLength; j++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        result += id;
    }
    return result;
}

const testData = generateCombinedIds();
encodedData = encodeIds(testData);
decodedData = decodeIds(encodedData);
finalSize = JSON.stringify(encodedData).length;
console.log(`Final Storage Size (JSON): ${finalSize} bytes`);
