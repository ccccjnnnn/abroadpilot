export async function audioBlobToWav(
  blob: Blob
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  const audioContext = new AudioContext();

  const audioBuffer =
    await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const channels = audioBuffer.numberOfChannels;

  const mono = new Float32Array(length);

  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channels;
    }
  }

  const wavBuffer = new ArrayBuffer(
    44 + length * 2
  );

  const view = new DataView(wavBuffer);

  function writeString(
    offset: number,
    value: string
  ) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(
        offset + i,
        value.charCodeAt(i)
      );
    }
  }

  writeString(0, "RIFF");

  view.setUint32(
    4,
    36 + length * 2,
    true
  );

  writeString(8, "WAVE");
  writeString(12, "fmt ");

  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);

  view.setUint32(
    24,
    sampleRate,
    true
  );

  view.setUint32(
    28,
    sampleRate * 2,
    true
  );

  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(36, "data");

  view.setUint32(
    40,
    length * 2,
    true
  );

  let offset = 44;

  for (let i = 0; i < length; i++) {
    const sample = Math.max(
      -1,
      Math.min(1, mono[i])
    );

    view.setInt16(
      offset,
      sample < 0
        ? sample * 0x8000
        : sample * 0x7fff,
      true
    );

    offset += 2;
  }

  await audioContext.close();

  return new Blob(
    [wavBuffer],
    {
      type: "audio/wav",
    }
  );
}