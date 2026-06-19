# WORLDPRINT Data Pipeline

Run from the repository root:

```bash
python3 tools/data_pipeline/build.py
```

The first milestone intentionally uses only the Python standard library. The pipeline fetches official source JSON over HTTPS, writes static gameplay artifacts to `public/`, and writes validation reports to `generated/reports/`.

