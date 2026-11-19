import zipfile, re, sys, os, json, html
roots = sys.argv[1:]
YT = re.compile(r'(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:[^"\s<>]*?&(?:amp;)?)?v=|embed/|v/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})')
out = []
for root in roots:
  for dp, dn, fn in os.walk(root):
    for f in fn:
      if not f.lower().endswith('.pptx') or f.startswith('~$'): continue
      p = os.path.join(dp, f)
      try: z = zipfile.ZipFile(p)
      except Exception as e: print('BAD', p, e, file=sys.stderr); continue
      names = z.namelist()
      media = [n for n in names if n.startswith('ppt/media/') and re.search(r'\.(mp4|mov|m4v|wmv|avi|mpg|mpeg)$', n, re.I)]
      for n in names:
        m = re.match(r'ppt/slides/(?:_rels/)?slide(\d+)\.xml(\.rels)?$', n)
        if not m: continue
        txt = z.read(n).decode('utf8', 'ignore')
        for vid in set(YT.findall(txt)):
          # title text on slide
          title = ''
          if not n.endswith('.rels'):
            ts = re.findall(r'<a:t>([^<]*)</a:t>', txt)
            title = ' '.join(ts)[:200]
          out.append(dict(file=p, slide=int(m.group(1)), id=vid, src=n, text=html.unescape(title)))
        # other video links
        for u in set(re.findall(r'Target="(https?://[^"]+)"', txt)):
          if re.search(r'vimeo|video|mp4|ted\.com|dailymotion|youtube', u, re.I) and not YT.search(u):
            out.append(dict(file=p, slide=int(m.group(1)), url=html.unescape(u), src=n))
      if media: out.append(dict(file=p, media=media))
json.dump(out, sys.stdout, indent=1)
