// ===================================================================================
// SECTION 1: CHUNK-BASED ENCODING IMPLEMENTATION
// ===================================================================================

const ENCODING_BASE = 55203n;
const ENCODING_BASE_CHAR_CODE = 0x005D;
const MAX_CAPACITY = ENCODING_BASE ** 2n;

function calculateTotalStrings(alphabetSize, length) {
    const size = BigInt(alphabetSize);
    if (size <= 0 || length <= 0n) return 0n;
    if (size === 1n) return BigInt(length);
    const power = (b, e) => { let r = 1n; while (e > 0n) { if (e % 2n === 1n) r *= b; b *= b; e /= 2n; } return r; };
    return (size * (power(size, length) - 1n)) / (size - 1n);
}

function findMaxPossibleLength(alphabetSize, maxCapacity) {
    if (alphabetSize <= 1) return maxCapacity;
    let low = 1n, high = 2000n, maxLen = 0n;
    while (low <= high) {
        const mid = low + (high - low) / 2n;
        if (mid === 0n) break;
        const total = calculateTotalStrings(alphabetSize, mid);
        if (total <= maxCapacity) { maxLen = mid; low = mid + 1n; }
        else { high = mid - 1n; }
    }
    return maxLen;
}

function encodeIndexToUnicode(index) {
    const digit1 = index / ENCODING_BASE;
    const digit2 = index % ENCODING_BASE;
    const char1 = String.fromCodePoint(ENCODING_BASE_CHAR_CODE + Number(digit1));
    const char2 = String.fromCodePoint(ENCODING_BASE_CHAR_CODE + Number(digit2));
    return char1 + char2;
}

function decodeUnicodeToIndex(payload) {
    const digit1 = BigInt(payload.codePointAt(0) - ENCODING_BASE_CHAR_CODE);
    const digit2 = BigInt(payload.codePointAt(1) - ENCODING_BASE_CHAR_CODE);
    return digit1 * ENCODING_BASE + digit2;
}

function createEncoderDecoder(alphabetString) {
    const alphabet = Array.from(new Set(alphabetString)).sort().join('');
    const alphabetSize = BigInt(alphabet.length);
    const charMap = new Map(alphabet.split('').map((char, i) => [char, BigInt(i)]));
    const L_max = findMaxPossibleLength(alphabet.length, MAX_CAPACITY);
    const totalStrings = calculateTotalStrings(alphabet.length, L_max);

    if (L_max === 0n) {
        console.warn(`Warning: Alphabet "${alphabet}" is too large. Capacity is not enough for even length 1 strings.`);
    }

    return {
        alphabet, alphabetSize, L_max, totalStrings,
        getStringByIndex(index) {
            index = BigInt(index);
            if (index < 0n || index >= this.totalStrings) throw new Error(`Index ${index} is out of bounds.`);
            let length = 1n, baseOffset = 0n;
            while (true) {
                const countForLength = this.alphabetSize ** length;
                if (index < baseOffset + countForLength) break;
                baseOffset += countForLength;
                length++;
            }
            let positionInLengthGroup = index - baseOffset;
            let result = '';
            for (let i = length - 1n; i >= 0n; i--) {
                const power = this.alphabetSize ** i;
                const charIndex = positionInLengthGroup / power;
                result += this.alphabet[Number(charIndex)];
                positionInLengthGroup %= power;
            }
            return result;
        },
        getIndexByString(str) {
            const len = BigInt(str.length);
            if (len === 0n || len > this.L_max) throw new Error(`String "${str}" (length ${len}) is invalid.`);
            const baseOffset = (len > 1n) ? calculateTotalStrings(this.alphabetSize, len - 1n) : 0n;
            let positionInLengthGroup = 0n;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (!charMap.has(char)) throw new Error(`Invalid character "${char}".`);
                positionInLengthGroup += charMap.get(char) * (this.alphabetSize ** BigInt(str.length - 1 - i));
            }
            return baseOffset + positionInLengthGroup;
        }
    };
}

function encodeLongStringByChunks(longString) {
    const codec = createEncoderDecoder(longString);
    const L_max = Number(codec.L_max);
    if (L_max === 0) throw new Error("Cannot encode: The alphabet is too diverse for the given capacity.");
    const sizeCharCode = ENCODING_BASE_CHAR_CODE + (codec.alphabet.length - 1);
    const sizeChar = String.fromCodePoint(sizeCharCode);
    const header = sizeChar + codec.alphabet;
    let unicodePayloads = "";
    for (let i = 0; i < longString.length; i += L_max) {
        const chunk = longString.substring(i, i + L_max);
        const index = codec.getIndexByString(chunk);
        unicodePayloads += encodeIndexToUnicode(index);
    }
    return header + unicodePayloads;
}

function decodeLongStringByChunks(encodedData) {
    const sizeCharCode = encodedData.codePointAt(0);
    const alphabetLength = (sizeCharCode - ENCODING_BASE_CHAR_CODE) + 1;
    const alphabet = encodedData.substring(1, 1 + alphabetLength);
    const fullPayload = encodedData.substring(1 + alphabetLength);
    const codec = createEncoderDecoder(alphabet);
    let decodedString = "";
    for (let i = 0; i < fullPayload.length; i += 2) {
        const payloadChunk = fullPayload.substring(i, i + 2);
        const index = decodeUnicodeToIndex(payloadChunk);
        decodedString += codec.getStringByIndex(index);
    }
    return decodedString;
}


// ===================================================================================
// SECTION 2: CHUNKING ENCODER TEST
// ===================================================================================

function runChunkingTest(longInputString) {
    console.log("===============================================================");
    console.log("          CHUNK-BASED ENCODING METHOD TEST");
    console.log("===============================================================");
    console.log(`Original String Length: ${longInputString.length} characters`);
    console.log(`Original String Size (JSON): ${JSON.stringify(longInputString).length} bytes`);
    console.log("---------------------------------------------------------------");

    let encodedData, decodedData, finalSize;
    try {
        const startTime = performance.now();
        encodedData = encodeLongStringByChunks(longInputString);
        const encodeTime = performance.now() - startTime;

        const decodeStartTime = performance.now();
        decodedData = decodeLongStringByChunks(encodedData);
        const decodeTime = performance.now() - decodeStartTime;

        // The storage size is the length of the JSON-stringified version of the output.
        finalSize = JSON.stringify(encodedData).length;

        const compressionRatio = (finalSize / JSON.stringify(longInputString).length) * 100;

        console.log(`Encoded String Length: ${encodedData.length} characters`);
        console.log(`Final Storage Size (JSON): ${finalSize} bytes`);
        console.log(`Compression Ratio: ${compressionRatio.toFixed(2)}% of original`);
        console.log(`Time to Encode: ${encodeTime.toFixed(2)} ms`);
        console.log(`Time to Decode: ${decodeTime.toFixed(2)} ms`);
        console.log(`\nVerification (Success?): ${longInputString === decodedData ? "✅ Yes, data integrity maintained." : "❌ No, data was corrupted."}`);

    } catch (e) {
        console.error(`An error occurred during the test: ${e.message}`);
        console.error(e.stack);
    }

    console.log("\n===============================================================");
}

function generateCombinedIds() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
    const idLength = 21;
    const totalIds = 49;
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

const testData = generateCombinedIds()

// Run the test
runChunkingTest(testData);