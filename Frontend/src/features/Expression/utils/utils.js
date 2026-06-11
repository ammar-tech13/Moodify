import {
    FaceLandmarker,
    FilesetResolver
} from "@mediapipe/tasks-vision";


export const init = async ({ landmarkerRef, videoRef, streamRef }) => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    landmarkerRef.current = await FaceLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        }
    );

    streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = streamRef.current;
    await videoRef.current.play();
};

export const detect = ({ landmarkerRef, videoRef, setExpression }) => {
    if (!landmarkerRef.current || !videoRef.current) return null;

    const results = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
    );

    if (results.faceBlendshapes?.length > 0) {
        const blendshapes = results.faceBlendshapes[ 0 ].categories;

        const getScore = (name) =>
            blendshapes.find((b) => b.categoryName === name)?.score || 0;

        const smileLeft = getScore("mouthSmileLeft");
        const smileRight = getScore("mouthSmileRight");
        const jawOpen = getScore("jawOpen");
        const frownLeft = getScore("mouthFrownLeft");
        const frownRight = getScore("mouthFrownRight");
        const browDownL = getScore("browDownLeft");
        const browDownR = getScore("browDownRight");
        const browInnerUp = getScore("browInnerUp");
        const shrugLower = getScore("mouthShrugLower");

        let currentExpression = "Neutral";
        let confidenceScore = 1.0; // default for Neutral

        const happyScore = (smileLeft + smileRight) / 2;
        const surprisedScore = jawOpen * 0.8 + browInnerUp * 0.2;
        const angryScore = (browDownL + browDownR) / 2;
        const sadScore = Math.max(
            (frownLeft + frownRight) / 2,
            browInnerUp * 0.5 + shrugLower * 0.5
        );

        if (happyScore > 0.15) {
            currentExpression = "happy";
            confidenceScore = happyScore;
        } else if (surprisedScore > 0.25) {
            currentExpression = "surprised";
            confidenceScore = surprisedScore;
        } else if (angryScore > 0.15) {
            currentExpression = "angry";
            confidenceScore = angryScore;
        } else if (sadScore > 0.02) {
            currentExpression = "sad";
            confidenceScore = Math.min(1.0, sadScore * 10);
        }

        // Clamp confidence between 0 and 1, convert to percentage
        const confidencePercentage = Math.round(Math.max(0.1, Math.min(1.0, confidenceScore)) * 100);

        if (setExpression) {
            setExpression(currentExpression);
        }

        return {
            expression: currentExpression,
            confidence: confidencePercentage,
            landmarks: results.faceLandmarks?.[0] || []
        };
    }

    return null;
};