"""Static-file pipeline: the production Manifest storage and a size guard."""
import re
from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command

from config.settings import base

PAGES = ['/', '/backend/', '/devops/', '/network/', '/about/', '/contact/']


@pytest.fixture
def manifest_static(settings, tmp_path):
    """Collect static files with the production storage into a temp STATIC_ROOT."""
    settings.STATIC_ROOT = tmp_path
    settings.STORAGES = base.STORAGES
    call_command('collectstatic', interactive=False, verbosity=0)
    return tmp_path


def test_production_uses_manifest_storage():
    backend = base.STORAGES['staticfiles']['BACKEND']
    assert backend == 'whitenoise.storage.CompressedManifestStaticFilesStorage'


def test_collectstatic_hashes_and_compresses(manifest_static):
    assert (manifest_static / 'staticfiles.json').exists()
    assert list(manifest_static.glob('css/site.*.css'))
    assert list(manifest_static.glob('css/site.*.css.gz'))


@pytest.mark.django_db
@pytest.mark.parametrize('url', PAGES)
def test_pages_render_with_manifest_storage(manifest_static, client, url):
    response = client.get(url)
    assert response.status_code == 200
    assert re.search(r'/static/css/site\.[0-9a-f]{12}\.css', response.content.decode())


def _bytes(root, exclude=None):
    return sum(p.stat().st_size for p in root.rglob('*')
               if p.is_file() and not (exclude and exclude in p.parents))


def test_static_source_stays_small():
    """The old site shipped ~96 MB of video and frames under static/. Keep our own assets lean."""
    root = Path(settings.BASE_DIR, 'static')
    total = _bytes(root, exclude=root / 'vendor')
    assert total < 800_000, f'static/ (without vendor/) is {total:,} bytes'


def test_vendor_stays_bounded():
    """Self-hosted libraries (three.js, GSAP, Lenis) — raw size, before gzip."""
    vendor = Path(settings.BASE_DIR, 'static', 'vendor')
    total = _bytes(vendor)
    assert total < 1_600_000, f'static/vendor/ is {total:,} bytes'
