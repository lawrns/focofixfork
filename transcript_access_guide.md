# Dr. Jiang Xueqin Video Transcript Access Guide

## Transcript Availability

### YouTube Auto-Captions
- **Availability**: Available on ALL videos
- **Language**: English (primary)
- **Quality**: Good quality, manually verified by channel
- **Access Method**: Via YouTube's "Show transcript" feature

### How to Access Transcripts

#### Method 1: YouTube Web Interface
1. Open any video on YouTube
2. Click the "..." (More) button below the video
3. Select "Show transcript"
4. The transcript will appear on the right side
5. You can copy the text or download via browser extensions

#### Method 2: Using youtube-transcript-api (Python)
```python
from youtube_transcript_api import YouTubeTranscriptApi

# Get video ID from URL
# Example: https://www.youtube.com/watch?v=3t0MeVBD24I
# Video ID: 3t0MeVBD24I

video_id = "3t0MeVBD24I"
transcript = YouTubeTranscriptApi.get_transcript(video_id)

# Combine all text
full_text = " ".join([entry['text'] for entry in transcript])
```

#### Method 3: Using yt-dlp
```bash
# Install yt-dlp
pip install yt-dlp

# Extract subtitles
yt-dlp --list-subs "https://www.youtube.com/watch?v=3t0MeVBD24I"

# Download subtitles
yt-dlp --write-subs --sub-langs en "https://www.youtube.com/watch?v=3t0MeVBD24I"
```

---

## HIGHEST PRIORITY VIDEOS FOR TRANSCRIPTION

### Tier 1: Critical Priority

#### Secret History Series
| Video ID | Title | Duration | Views |
|----------|-------|----------|-------|
| WFWizN3QoPg | Secret History #END: Pax Judaica | 1:39:18 | 890K |
| 3t0MeVBD24I | Secret History #19: Dawn of the Jews | 1:12:34 | 710K |
| 4ehovUNrSrw | Secret History #16: The Big Bang of Greek Civilization | 1:07:36 | 290K |
| z0AwFin83lo | Secret History #20: The Hellenistic World | 1:18:07 | 250K |
| Y-gXVzwbFMU | Secret History #21: Roman Anti-Civilization | 1:25:56 | 280K |
| pp0E1gb80WQ | Secret History #22: The Divine Spark of Jesus | 1:37:08 | 490K |
| 6XGAc_OqCbU | Secret History #23: The Organization of Evil | 1:34:31 | 510K |
| TEdVhyE8pO0 | Secret History #24: Empire of Church | 1:24:38 | 200K |
| B5FtHagng8c | Secret History #25: Capital of Evil | 1:10:29 | 340K |
| kULUM_eB8KI | Secret History #26: Faith of Evil | 1:25:00 | 440K |
| ZPrecJHUOUs | Secret History #27: Empire of Evil | 1:27:42 | 300K |

#### Civilization Series (Key Episodes)
| Video ID | Title | Duration | Views |
|----------|-------|----------|-------|
| Jjqf9T59uY0 | Civilization #1: Explaining Humanity's Transition to Agriculture | 52:30 | 400K |
| x1E5rRmCiT4 | Civilization #2: Religion and the Dawn of Society | 56:43 | 200K |
| VanPH0GFTsA | Civilization #3: The Religious Imagination | 56:53 | 150K |
| RaT_ZUDjHrM | Civilization #4: The Paradise Lost of Marija Gimbutas | 59:19 | 130K |
| QwfB-vXXKWU | Civilization #6: Elite Overproduction and Bronze Age Collapse | 53:40 | 160K |
| 2OdO8LoKuo8 | Civilization #37: The Golden Age of Islam | 1:18:19 | 500K |
| _gH4PvIni5E | Civilization #END: The Decline and Fall of the American Empire | 1:06:56 | 800K |

#### Game Theory Series
| Video ID | Title | Duration | Views |
|----------|-------|----------|-------|
| hE4l9WyLF3U | Game Theory #1: The Dating Game | 49:33 | 880K |
| kS-muAuq62E | Game Theory #2: Why Schools Suck | 49:06 | 430K |
| MX93U4KzA28 | Game Theory #3: Rich Dad, Poor Dad | 53:33 | 930K |
| 35HRPLVyF0g | Game Theory #4: The Immigration Trap | 46:18 | 390K |
| ybufqRY77PQ | Game Theory #5: The World Game | 57:16 | 380K |
| CbamEcNuDXo | Game Theory #6: The World's Bank | 45:01 | 650K |
| ijkCt1QK6k | Game Theory #7: America's Game | 48:32 | 490K |
| axqDLhWs93Q | Game Theory #8: Communist Specter | 55:25 | 310K |
| jIS2eB-rGv0 | Game Theory #9: The US-Iran War | 45:25 | 2.89M |
| t5oisJiorsU | Game Theory #10: The Law of Asymmetry | 53:36 | 900K |

#### Geo-Strategy Series
| Video ID | Title | Duration | Views |
|----------|-------|----------|-------|
| xEEpOxqdU5E | Geo-Strategy #1: Iran's Strategy Matrix | 44:50 | 640K |
| lkKrZq4YdqY | Geo-Strategy #2: Christian Zionism and Middle East Conflict | 44:54 | 390K |
| _blj8zKdKgA | Geo-Strategy #3: How Empire is Destroying America | 47:42 | 690K |
| 7y_hbz6loEo | Geo-Strategy #8: The Iran Trap | 1:05:21 | 3.58M |
| AEPSUC-UQ5k | Geo-Strategy #9: Putin's War for the Soul of Russia | 1:05:34 | 500K |
| B_al2wgk49Y | Geo-Strategy #10: Putin's Strategic Imagination | 1:05:51 | 380K |
| Go1bMQKnJBQ | Geo-Strategy #11: The Second American Civil War | 1:08:03 | 630K |
| s_k6esWheqA | Geo-Strategy END: Psychohistory | 1:11:31 | 400K |

---

## RECOMMENDED TRANSCRIPTION WORKFLOW

### For LLM Training Data

1. **Start with Secret History series** (28 videos)
   - Core theoretical framework
   - ~30 hours of content
   - Highest information density

2. **Add Civilization series** (62 videos)
   - Historical case studies
   - ~65 hours of content
   - Provides historical evidence

3. **Include Game Theory series** (10 videos)
   - Applied frameworks
   - ~8 hours of content
   - Practical applications

4. **Supplement with Geo-Strategy** (20 videos)
   - Current events analysis
   - ~15 hours of content
   - Contemporary relevance

### Estimated Total Content
- **Videos**: 120 full lectures
- **Hours**: ~120 hours
- **Words**: ~1.5-2 million words (estimated)

---

## CONTENT WARNINGS

Some videos contain:
- Discussion of "evil" as historical/sociological concept
- Analysis of controversial historical events
- Critique of political systems and leaders
- Occasional strong language

Viewer discretion advised on Secret History episodes marked as containing graphic/disturbing content.

---

## ADDITIONAL RESOURCES

### Substack
- URL: https://predictivehistory.substack.com
- Contains written articles and lecture notes

### Support/Buy Me a Coffee
- URL: https://buymeacoffee.com/PredictiveHistory

### Related Channels
- Prof. Jiang Clips: https://www.youtube.com/@profjiangclips
- Prof Jiang Academy: https://www.youtube.com/@ProfJiangAcademy

---

*Transcript Guide - Generated 2025*
*For LLM training and research purposes*
