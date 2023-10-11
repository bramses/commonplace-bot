// Long endpoint: /synthesisTasks
// - Up to 500,000 characters
// - Asynchronous, takes ~1s per 800 chars
// - Returns a TaskId (use to check status)

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

export const tts = async (text) => {
  const data = {
    Text: text, // Up to 500,000 characters
    VoiceId: "Liv", // Dan, Will, Scarlett, Liv, Amy
    Bitrate: "192k", // 320k, 256k, 192k, ...
    Speed: "0.2", // -1.0 to 1.0
    Pitch: "1", // -0.5 to 1.5
    TimestampType: "sentence", // word or sentence
    //'CallbackUrl': '<URL>', // pinged when ready
  };

  try {
    const response = await fetch(
      "https://api.v6.unrealspeech.com/synthesisTasks",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.unreal_voice_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(
        "HTTP error " + response.status + " " + response.statusText
      );
    }

    const responseData = await response.json();

    const isDone = async (taskId) => {
      const response = await fetch(
        "https://api.v6.unrealspeech.com/synthesisTasks/" + taskId,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + process.env.unreal_voice_key,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();

      if (responseData.SynthesisTask.TaskStatus === "completed") {
        return true;
      } else {
        return false;
      }
    };

    let timesChecked = 0;

    const check = async (taskId) => {
      const done = await isDone(taskId);

      if (done || timesChecked > 6) {
        return true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await check(taskId);
        timesChecked++;

      }
    };

    if (responseData.SynthesisTask.TaskStatus === "completed") {
      return responseData.SynthesisTask.OutputUri;
    }

    await check(responseData.SynthesisTask.TaskId);

    return responseData.SynthesisTask.OutputUri;
  } catch (error) {
    console.error("Error:", error);
    throw new Error(error);
  }
};
