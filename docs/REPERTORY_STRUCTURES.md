# Repertory Structure Analysis

Comprehensive analysis of homeopathic repertory structures based on parsed data from Kent, Murphy, Synthesis, and Boenninghausen (BG3.100). This document serves as a reference for building effective AI prompts and search guides that work across all repertories.

## Executive Summary

| Repertory | Chapters | Total Symptoms | Root Rubrics | Unique Characteristics |
| ----------- | ---------- | ---------------- | -------------- | ------------------------ |
| Kent | 39 | 67,756 | 3,277 | Traditional head-to-toe, ALL CAPS roots |
| Murphy | 74 | 134,237 | 13,343 | Granular body parts, clinical chapters |
| Synthesis | 43 | 246,855 | 8,580 | Largest, massive COUGH/FEVER chapters |
| BG3.100 | 79 | 3,069 | 2 | Boenninghausen-style, very granular |

## Kent Repertory

### Kent: Structure Overview

Kent follows the traditional anatomical head-to-toe organization established by J.T. Kent.

**Chapters (39 total):**

```text
MIND, VERTIGO, HEAD, EYE, VISION, EAR, HEARING, NOSE, FACE, MOUTH,
TEETH, THROAT INTERNAL, EXTERNAL THROAT, STOMACH, ABDOMEN, RECTUM,
STOOL, BLADDER-URINARY ORGANS, KIDNEY-URINARY ORGANS, PROSTATE-URINARY ORGANS,
URETHRA-URINARY ORGANS, URINE, MALE GENITALIA, FEMALE GENITALIA,
LARYNX-TRACHEA, RESPIRATION, COUGH, EXPECTORATION, CHEST, BACK,
EXTREMITIES, SLEEP, DREAMS, CHILL, FEVER, PERSPIRATION, SKIN, GENERALS, SMELL
```

### Kent: Rubric Format

**Root Rubrics:**

- ALL CAPS with trailing comma: `DELUSIONS,`, `DRYNESS`, `ABRUPT`
- Represent top-level symptom categories

**Sub-Rubrics:**

- Title case or lowercase
- Form hierarchical paths with parent

**Example Hierarchy:**

```text
Root:  DELUSIONS,
├── clouds,
│   └── strange,settled upon patients, or danced about the sun
├── conspiracies
│   ├── against her father,thought the landlord's bills were
│   └── against him,there were
└── cockroaches swarmed about the room
```

### Kent: Text Patterns

Kent rubrics often use:

- Comma-separated fragments within text
- Context-dependent phrasing (reads with path)
- Traditional homeopathic abbreviations

**Examples:**

```text
"confidence in him,his friends have lost all"
"corners of houses seem to project so that he fears he will run against them"
"strange,settled upon patients, or danced about the sun"
```

### Kent: Search Implications

- Location comes from chapter name + path hierarchy
- Root rubrics searchable by ALL CAPS pattern
- Fragmented text requires understanding path context

## Murphy Repertory

### Murphy: Structure Overview

Murphy uses a more clinically-oriented organization with granular body part chapters.

**Chapters (74 total) - Notable:**

```text
Abdomen, Ankles, Arms, Back, Bladder, Bones, Brain, Breasts, Breathing,
Cancer, Chest, Children, Chills, Clinical, Constitutions, Coughing,
Dreams, Ears, Elbows, Eyes, Face, Fainting, Feet, Female, Fevers, Food,
Gallbladder, Generals, Glands, Hands, Head, Headaches, Hearing, Heart,
Hips, Intestines, Joints, Kidneys, Knees, Larynx, Legs, Limbs, Liver,
Lungs, Male, Mind, Mouth, Muscles, Neck, Nose, Pelvis, Perspiration,
Pregnancy, Pulse, Rectum, Shoulders, Skin, Sleep, Speech/Voice, Spleen,
Stomach, Stool, Taste, Teeth, Throat, Time, Tongue, Toxicity, Urine,
Vaccinations, Vertigo, Vision, Weakness, Wrists
```

**Unique Clinical Chapters:**

- Cancer, Children, Clinical, Constitutions, Pregnancy, Vaccinations, Toxicity, Weakness

### Murphy: Rubric Format

**Root Rubrics:**

- Format: `SYMPTOM, location` (e.g., `HEADACHES, general, head pain`)
- More descriptive and standalone

**Example Hierarchy:**

```text
Root:  RETRACTION, abdomen
├── hypogastrium
│   ├── lying, on back
│   │   └── motion, following loose, after breakfast
│   └── pulsations, with
├── spasmodically
├── spots
│   ├── at certain, distended at others
│   └── stool, during
└── umbilicus
```

### Murphy: Text Patterns

Murphy rubrics:

- More standalone descriptions
- Location embedded in root rubric name
- Modern clinical terminology alongside traditional

**Examples:**

```text
"HEADACHES, general, head pain"
"lying, on back"
"motion, following loose, after breakfast"
```

### Murphy: Search Implications

- Search by symptom name + body part together
- Clinical chapter names helpful for condition-based searches
- More intuitive for modern users

## Synthesis Repertory

### Synthesis: Structure Overview

Synthesis is the largest repertory, a synthesis of multiple sources.

**Chapters (43 total):**

```text
PERSONAL CHAPTER, MIND, VERTIGO, HEAD, EYE, VISION, EAR, HEARING,
NOSE, FACE, MOUTH, TEETH, THROAT, EXTERNAL THROAT, NECK, STOMACH,
ABDOMEN, RECTUM, STOOL, BLADDER, KIDNEYS, PROSTATE GLAND, URETHRA,
URINE, URINARY ORGANS, MALE GENITALIA/SEX, FEMALE GENITALIA/SEX,
MALE AND FEMALE GENITALIA/SEX, LARYNX AND TRACHEA, RESPIRATION,
COUGH, EXPECTORATION, CHEST, BACK, EXTREMITIES, SLEEP, DREAMS,
CHILL, FEVER, PERSPIRATION, SKIN, GENERALS, OLD SYMPTOMS
```

**Notable Size Distribution:**

| Chapter | Symptom Count |
| --------- | --------------- |
| FEVER | 63,632 |
| COUGH | 44,081 |
| CHILL | 26,466 |
| PERSPIRATION | 16,177 |
| STOOL | 13,081 |

### Synthesis: Rubric Format

Similar to Kent with ALL CAPS root rubrics:

```text
Root:  DAYTIME
Root:  MORNING
├── (multiple time modifiers)
```

**Data Quality Note:** Parsing artifacts exist:

- `2Responsibility` (numeric prefix from grading)
- `3disease / 3lung`
- `cZ,` (encoding issues)

### Synthesis: Search Implications

- Very large symptom counts in certain chapters (COUGH, FEVER)
- May need pagination/limiting
- Some rubrics may have parsing artifacts

## Boenninghausen (BG3.100)

### BG3.100: Structure Overview

Most granular chapter breakdown following Boenninghausen's methodology.

**Chapters (79 total) - Highly Specific:**

```text
TIME, CONDITIONS OF AGGRAVATION AND AMELIORATION, GENERALITIES,
INTELLECT, MIND, VERTIGO, HEAD, EXTERNAL HEAD; BONES AND SCALP,
EYES, VISION, EARS, HEARING, NOSE AND ACCESSORY CAVITIES, FACE,
TEETH, GUMS, PALATE, TONGUE, MOUTH AND THROAT, SALIVA, TASTE,
APPETITE, AVERSIONS TO FOOD, THIRST, CRAVINGS AND DESIRES,
WATERBRASH, HEARTBURN, QUALMISHNESS, HICCOUGH, NAUSEA, REGURGITATION,
RETCHING AND GAGGING, VOMITING, ERUCTATIONS, EPIGASTIUM,
STOMACH AND ABDOMEN, EXTERNAL ABDOMEN, HYPOCHONDRIAE, FLATULENCE,
GROINS, ANUS AND RECTUM, PERINEUM, STOOL, MICTURITION, URINE,
SEDIMENT, URINATION, URINARY ORGANS, GENITALS IN GENERAL,
MALE ORGANS, FEMALE ORGANS, SEXUAL IMPULSE, MENSTRUATION,
LEUKORRHOEA, RESPIRATION, COUGH, LARYNX AND TRACHEA, VOICE AND SPEECH,
EXTERNAL THROAT, NECK (NAPE), CHEST AND LUNGS, EXTERNAL CHEST,
AXILLAE, MAMMAE, NIPPLES, HEART CIRCULATION AND PULSE,
BACK SPINE AND CORD, SCAPULAR REGION, DORSAL REGION, LUMBAR REGION,
SACRUM, UPPER LIMBS, LOWER LIMBS, SKIN, SLEEP, DREAMS,
CHILL CHILLINESS COLDNESS, HEAT, SWEAT
```

### BG3.100: Rubric Format

Uses abbreviated notation:

```text
"agg." (aggravation)
"amel." (amelioration)
"alternate days; agg. On"
"bed; agg. in"
```

### BG3.100: Search Implications

- Very specific chapter targeting
- Traditional abbreviations required
- Good for modality-focused searches

## Universal Search Patterns

### Cross-Repertory Search Strategies

#### Strategy 1: Location-First (Works Everywhere)

```text
Query: head pain
Kent:   HEAD chapter, searches "pain" rubrics
Murphy: Head + Headaches chapters
Synthesis: HEAD chapter
BG3.100: HEAD chapter
```

#### Strategy 2: Symptom-Qualifier

```text
Query: pain throbbing
Works across all repertories as symptom descriptor
```

#### Strategy 3: Modality Search

```text
Query: agg motion
Query: worse motion
Both patterns should be supported
```

### Vocabulary Mapping (Universal)

| Natural Language | Repertory Term(s) | Notes |
| ----------------- | ------------------- | ------- |
| blocked nose | obstruction, coryza | Kent/Synthesis |
| headache | head pain, cephalalgia | All |
| worse, worsening | agg, aggravation | All |
| better, improving | amel, amelioration | All |
| sharp pain | stitching, stabbing | All |
| pounding | pulsating, throbbing | All |
| runny nose | coryza, discharge | All |
| dizziness | vertigo | All |
| difficulty breathing | dyspnea | Murphy clinical |
| nosebleed | epistaxis | All |
| fever | pyrexia, fever | Murphy has FEVERS chapter |
| throwing up | vomiting | All |
| stomach pain | abdomen pain, gastric | Murphy: Stomach chapter |

### Murphy-Specific Terms

Murphy adds clinical vocabulary:

| Clinical Term | Murphy Chapter |
| -------------- | ---------------- |
| cancer symptoms | Cancer |
| child-specific | Children |
| pregnancy-related | Pregnancy |
| vaccine reactions | Vaccinations |
| constitution type | Constitutions |
| poisoning, toxin | Toxicity |

### Chapter Mapping Table

For cross-repertory searches, map anatomical locations:

| Body Part | Kent | Murphy | Synthesis |
| ----------- | ------ | -------- | ----------- |
| Head/Headache | HEAD | Head, Headaches | HEAD |
| Eye | EYE, VISION | Eyes, Vision | EYE, VISION |
| Ear | EAR, HEARING | Ears, Hearing | EAR, HEARING |
| Throat | THROAT INTERNAL | Throat, Larynx | THROAT |
| Stomach | STOMACH | Stomach, Food | STOMACH |
| Extremities | EXTREMITIES | Arms, Legs, Hands, Feet, etc. | EXTREMITIES |

## AI Agent Prompt Guidelines

### Search Query Construction

1. **Keep queries short**: 2-3 words maximum
2. **Location first**: `head pain` not `pain head`
3. **Use wildcards**: `head*` catches headache, head pain, etc.
4. **Traditional vocabulary**: Map natural language to repertory terms

### Handling No Results

```text
1. Reduce to 2 words
2. Swap vocabulary (blocked → obstruction)
3. Add wildcard suffix: nose* instead of nose
4. Try broader term: pain instead of sharp shooting pain
5. Remove exact phrase quotes if used
```

### Repertory-Aware Search

When specific repertory is chosen:

- **Kent**: Use traditional terminology, ALL CAPS for root searches
- **Murphy**: Can use clinical terms, search body part + symptom
- **Synthesis**: Same as Kent, expect more results
- **Boenninghausen**: Use abbreviations (agg., amel.)

### Multi-Repertory Strategy

When repertory not specified:

1. Start with universal terms (location + symptom)
2. Use wildcards for variations
3. Don't assume specific chapter structure
4. Rely on full-text search rather than path navigation

## OOREP Backend Search Capabilities

Understanding what the backend supports is critical for determining MCP layer responsibilities.

### Supported Features

| Feature | Supported | Syntax | Example |
| --------- | ----------- | -------- | --------- |
| Wildcards | YES | `*` at word start/end | `urin*`, `*pain`, `*urin*` |
| Exact phrases | YES | `"phrase"` | `"gums swollen"` |
| Exclusions | YES | `-term` or `-"phrase"` | `-weakness`, `-"strong pain"` |
| Case insensitive | YES | Automatic | `HEAD` = `head` |
| Multi-term AND | YES | Space-separated | `head pain` (both must match) |

### Not Supported

| Feature | Status | Implication |
| --------- | -------- | ------------- |
| Fuzzy/Levenshtein | NO | No typo tolerance |
| Synonym expansion | NO | `worse` won't find `agg` |
| OR logic | NO | Can't search `worse OR agg` |
| Query normalization | NO | Must be done client-side |

### Wildcard Rules

```text
ALLOWED:
  urin*      → matches urine, urinary, urination
  *ache      → matches headache, backache, toothache
  *pain*     → matches pain anywhere in word

NOT ALLOWED:
  ur*in      → wildcard in middle of word (rejected)
  *          → standalone wildcard (rejected)
```

### Search Algorithm (from backend analysis)

1. **First term** used for initial DB LIKE query (narrows results)
2. **All terms** matched in-memory against rubric text, path, and fullPath
3. **AND logic**: ALL positive terms must match somewhere
4. **Exclusion**: NO negative terms can match

### Why Normalization is Risky

The backend uses AND logic for multiple terms:

```text
Query: "blocked obstruction"
Result: Rubrics must contain BOTH words → fewer results

Query: "obstruction"
Result: Rubrics containing "obstruction" → correct

Query: "blocked" (user intent)
Result: Rubrics containing "blocked" → what user wanted
```

**Replacing** `blocked` with `obstruction` loses matches where rubrics literally say "blocked".
**Adding** `obstruction` to `blocked` requires both to match → worse results.

### Correct Approach: Use Wildcards

```text
Query: "block* obstruct*"   ← WRONG (AND logic, both must match)
Query: "obstruct*"          ← Better (catches obstruction, obstructed)
Query: "*block*"            ← Catches blocked, blocking, unblocked
```

The MCP layer should EDUCATE users to use wildcards, not auto-transform queries.

## MCP Layer Responsibility Matrix

Based on backend capabilities analysis:

### SHOULD DO (Education/Guidance)

| Action | Rationale |
| -------- | ----------- |
| Provide comprehensive search guide | Single source of truth |
| Document vocabulary mappings | AI agents can learn proper terms |
| Explain wildcard usage | Already supported, underutilized |
| Show repertory-specific examples | Different structures need different approaches |

### SHOULD NOT DO (Query Transformation)

| Action | Why Not |
| -------- | --------- |
| Automatic synonym replacement | Loses original matches, AND logic worsens results |
| Fuzzy matching | Not supported by backend |
| Query expansion | AND logic means more terms = fewer results |

### COULD DO (Future Enhancements)

| Action | Consideration |
| -------- | --------------- |
| `suggestAlternatives: true` param | Return query suggestions without executing |
| Query validation warnings | Warn about natural language patterns in queries |
| Success rate metrics | Track search effectiveness for continuous improvement |

## Recommendations for OOREP-MCP

### Implemented in v1.2.1

The search guide (`oorep://help/search-syntax`) has been completely rewritten based on analysis of 451,918 symptoms across all repertories:

1. **Wildcard-first approach**: Primary search strategy
2. **Universal vocabulary mapping**: Natural language → repertory terms
3. **AND logic explanation**: Why fewer terms = more results
4. **Recovery strategies**: Step-by-step when 0 results
5. **Modality emphasis**: `agg`/`amel` not "worse"/"better"
6. **Quick reference card**: Condensed guidance for AI agents

Note: Occurrence counts from analysis were used to inform decisions but removed from final guide to reduce noise for AI agents.

### Not Implemented (By Design)

| Feature | Reason |
| --------- | -------- |
| Query normalization | AND logic makes it counterproductive |
| Fuzzy matching | Not supported by backend |
| Separate vocabulary resource | Integrated into enhanced search guide |
| Repertory-specific guides | Universal patterns work across all repertories |

## Appendix: Sample Rubrics by Repertory

### Kent Sample

```json
{
  "text": "DELUSIONS,",
  "path": ["DELUSIONS,"],
  "chapter_name": "MIND",
  "is_root_rubric": true
}
```

### Murphy Sample

```json
{
  "text": "HEADACHES, general, head pain",
  "path": ["HEADACHES, general, head pain"],
  "chapter_name": "Headaches",
  "is_root_rubric": true
}
```

### Synthesis Sample

```json
{
  "text": "MORNING",
  "path": ["MORNING"],
  "chapter_name": "MIND",
  "is_root_rubric": true
}
```

### BG3.100 Sample

```json
{
  "text": "agg.",
  "path": ["agg."],
  "chapter_name": "TIME",
  "is_root_rubric": false
}
```
