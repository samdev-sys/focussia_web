import io
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FocusIA Voice Cloning")

VOICES_DIR = os.path.join(os.path.dirname(__file__), "voices")

AVATAR_VOICE_MAP = {
    1: "john.mp3",
    2: "conrad_voice.mp3",
    3: "ashley_voice.mp3",
    4: "lia_voice.mp3",
    5: "monroe_voice.mp3",
    6: "sophya_voice.mp3",
}

model = None

def load_model():
    global model
    if model is not None:
        return model
    logger.info("Loading XTTS v2 model...")
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts
    config = XttsConfig()
    model_path = os.environ.get("XTTS_MODEL_PATH", "coqui/XTTS-v2")
    config.load_json(os.path.join(str(model_path) if not model_path.startswith("coqui") else "", "config.json"))
    model = Xtts.init_from_config(config)
    model.load_checkpoint(config, checkpoint_dir=str(model_path), eval=True)
    if hasattr(model, "to"):
        model.to("cpu")
    logger.info("XTTS v2 model loaded")
    return model


class TTSRequest(BaseModel):
    avatar_index: int
    text: str
    language: str = "es"


@app.post("/tts")
async def generate_tts(req: TTSRequest):
    filename = AVATAR_VOICE_MAP.get(req.avatar_index)
    if not filename:
        raise HTTPException(status_code=404, detail="Avatar no válido")

    sample_path = os.path.join(VOICES_DIR, filename)
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Muestra de voz no encontrada")

    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Texto requerido")

    try:
        xtts = load_model()
        logger.info(f"Clonando voz desde {filename} para texto: {req.text}")

        gpt_cond, speaker_embed = xtts.get_conditioning_latents(audio_path=[sample_path])

        output = xtts.inference(
            text=req.text,
            language=req.language,
            gpt_cond_latent=gpt_cond,
            speaker_embedding=speaker_embed,
        )

        import soundfile as sf
        buf = io.BytesIO()
        sf.write(buf, output["wav"], samplerate=24000, format="OGG")
        buf.seek(0)
        audio_data = buf.read()

        logger.info(f"Audio generado: {len(audio_data)} bytes")
        return Response(content=audio_data, media_type="audio/ogg")

    except Exception as e:
        logger.exception("Error generando TTS")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8760)
