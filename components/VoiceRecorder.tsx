"use client";

import { useRef, useState } from "react";
import { audioBlobToWav } from "../lib/audioToWav";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] =
    useState(false);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [audioBlob, setAudioBlob] =
    useState<Blob | null>(null);

  const [transcript, setTranscript] =
    useState("");

  const [isTranscribing, setIsTranscribing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  async function startRecording() {
    try {
      setError(null);
      setTranscript("");
      setAudioBlob(null);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type: recorder.mimeType,
          }
        );

        setAudioBlob(blob);

        const url =
          URL.createObjectURL(blob);

        setAudioUrl(url);

        stream
          .getTracks()
          .forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(error);

      setError(
        "Could not access microphone."
      );
    }
  }

  function stopRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state === "recording"
    ) {
      recorder.stop();
    }

    setIsRecording(false);
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function transcribe() {
  if (!audioBlob) {
    return;
  }

  try {
    setError(null);
    setTranscript("");
    setIsTranscribing(true);

    const wavBlob =
      await audioBlobToWav(
        audioBlob
      );

    const formData =
      new FormData();

    formData.append(
      "audio",
      wavBlob,
      "recording.wav"
    );

    const submitResponse =
      await fetch(
        "/api/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

    const submitData =
      await submitResponse.json();

    if (!submitResponse.ok) {
      throw new Error(
        submitData.error ||
          "Could not submit transcription."
      );
    }

    const taskId =
      submitData.taskId;

    if (!taskId) {
      throw new Error(
        "ASR task ID was not returned."
      );
    }

    for (
      let attempt = 0;
      attempt < 40;
      attempt++
    ) {
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      );

      const queryResponse =
        await fetch(
          `/api/transcribe?taskId=${encodeURIComponent(
            taskId
          )}`,
          {
            cache: "no-store",
          }
        );

      const queryData =
        await queryResponse.json();

      if (
        queryResponse.status === 202
      ) {
        continue;
      }

      if (!queryResponse.ok) {
        throw new Error(
          queryData.error ||
            "Transcription failed."
        );
      }

      setTranscript(
        queryData.text || ""
      );

      return;
    }

    throw new Error(
      "Transcription is taking longer than expected. Please try again."
    );
  } catch (error) {
    console.error(error);

    setError(
      error instanceof Error
        ? error.message
        : "Transcription failed."
    );
  } finally {
    setIsTranscribing(false);
  }
}

  return (
    <div className="mt-12 flex w-full flex-col items-center">
      <button
        onClick={toggleRecording}
        className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl text-white shadow-xl transition-all ${
            isRecording
                ? "scale-110 bg-red-500"
                : "bg-black hover:scale-105"
        }`}
      >
        {isRecording ? "■" : "🎙"}
      </button>

      <p className="mt-6 text-lg font-medium">
        {isRecording
          ? "Recording..."
          : "Tap to start talking"}
      </p>

      {audioUrl && !isRecording && (
        <div className="mt-8 w-full rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-3 font-medium">
            Your recording
          </p>

          <audio
            controls
            src={audioUrl}
            className="w-full"
          />

          <button
            onClick={transcribe}
            disabled={isTranscribing}
            className="mt-5 w-full rounded-xl bg-black px-4 py-3 text-white disabled:bg-gray-400"
          >
            {isTranscribing
              ? "Transcribing..."
              : "Transcribe"}
          </button>
        </div>
      )}

      {transcript && (
        <div className="mt-6 w-full rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium">
            Transcript
          </p>

          <p className="mt-3 text-gray-700">
            {transcript}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 w-full rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}