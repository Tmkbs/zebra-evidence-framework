"""Pick a unique direct paragraph in a pinned, sanitized local HTML projection."""
import re
from trusted_operation import digest, equal

HEADING = re.compile(r'h[1-6]')
CONTAINERS = frozenset({'html','body','main','article','div','section'})
HEADING_INLINE = frozenset({'a','abbr','b','br','cite','code','em','i','kbd','mark',
                            's','samp','small','span','strong','sub','sup','u','var','wbr'})

def select_before(source, operation, locate_class, fail):
    section_id = operation['section_anchor']
    target_id = operation['target_anchor']
    expect = operation['paragraph_sha256']

    class NativeBefore(locate_class):
        def __init__(self):
            super().__init__(source, None)
            self.owners = None
            self.level = None
            self.section_count = 0
            self.ids = set()
            self.open_heading = False

        def safe(self, tag, attrs):
            super().safe(tag, attrs)
            ids = [value for key,value in attrs if key == 'id']
            if len(ids)>1 or target_id in ids:
                fail()
            for value in ids:
                if value:
                    if value in self.ids:
                        fail()
                    self.ids.add(value)
            if section_id in ids:
                self.section_count += 1
                if HEADING.fullmatch(tag) is None:
                    fail()

        def handle_starttag(self, tag, attrs):
            parent = self.frames[-1] if self.frames else None
            native_heading = HEADING.fullmatch(tag) is not None
            starts = (dict(attrs).get('id') == section_id and native_heading)
            if self.open_heading and tag not in HEADING_INLINE:
                fail()
            if starts:
                ancestry = [f['tag'] for f in self.frames]
                if (ancestry.count('main') != 1 or ancestry.count('article') != 1 or
                    ancestry.index('main') >= ancestry.index('article') or
                    any(name not in CONTAINERS for name in ancestry)):
                    fail()
            if (self.owners is not None and any(f is self.owners for f in self.frames)
                    and native_heading and int(tag[1]) <= self.level):
                if parent is not self.owners:
                    fail()
                self.owners = None
            direct = tag == 'p' and self.owners is not None and parent is self.owners
            if tag=='p' and any(f['tag']=='p' or HEADING.fullmatch(f['tag']) for f in self.frames):
                fail()
            super().handle_starttag(tag, attrs)
            if starts:
                self.owners = parent
                self.level = int(tag[1])
                self.open_heading = True
            if direct:
                self.frames[-1]['target'] = True

        def handle_startendtag(self, tag, attrs):
            if self.open_heading and tag not in HEADING_INLINE:
                fail()
            super().handle_startendtag(tag, attrs)

        def handle_endtag(self, tag):
            if self.frames and self.frames[-1] is self.owners:
                self.owners = None
            super().handle_endtag(tag)
            if self.open_heading and HEADING.fullmatch(tag):
                self.open_heading = False

    p=NativeBefore()
    p.feed(source)
    p.close()
    if p.frames or p.section_count != 1:
        fail()
    matches=[(a,b) for a,b in p.matches if equal(digest(source[a:b].encode('utf-8')),expect)]
    if len(matches)!=1:
        fail()
    return matches[0]
