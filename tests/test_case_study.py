import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.projects.models import Project, ProjectImage

GIF = (b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00'
       b',\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')


def make(**kw):
    base = dict(title='Portfolio', description='d', tech_stack='Python, Django, Docker')
    base.update(kw)
    return Project(**base)


def test_features_list_one_per_line():
    assert make(features='Fast\n\n  Secure  \n').features_list == ['Fast', 'Secure']


def test_architecture_steps_are_numbered():
    p = make(architecture='Client | Browser | Sends request\nAPI | Django | Handles it')
    assert p.architecture_steps == [
        {'step': '01', 'title': 'Client', 'tech': 'Browser', 'desc': 'Sends request'},
        {'step': '02', 'title': 'API', 'tech': 'Django', 'desc': 'Handles it'},
    ]


def test_malformed_lines_are_tolerated():
    p = make(architecture='Only a title', decisions='Title only', metrics='Label only')
    assert p.architecture_steps == [{'step': '01', 'title': 'Only a title', 'tech': '', 'desc': ''}]
    assert p.decisions_list == [{'title': 'Title only', 'desc': ''}]
    assert p.metrics_list == [{'label': 'Label only', 'value': ''}]


def test_metrics_and_decisions():
    p = make(metrics='Static assets | 317 KB', decisions='Manifest storage | Hashed names, 1-year cache')
    assert p.metrics_list == [{'label': 'Static assets', 'value': '317 KB'}]
    assert p.decisions_list == [{'title': 'Manifest storage', 'desc': 'Hashed names, 1-year cache'}]


def test_card_category():
    assert make(category='devops').card_category == 'DEVOPS • PYTHON • DJANGO'


@pytest.mark.django_db
def test_gallery_ordered_and_falls_back_to_image(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    p = make()
    p.save()
    assert p.gallery_urls == []
    p.image = SimpleUploadedFile('cover.gif', GIF, content_type='image/gif')
    p.save()
    assert p.gallery_urls == [p.image.url]
    second = ProjectImage.objects.create(project=p, order=2, image=SimpleUploadedFile('b.gif', GIF))
    first = ProjectImage.objects.create(project=p, order=1, image=SimpleUploadedFile('a.gif', GIF))
    assert p.gallery_urls == [first.image.url, second.image.url]


@pytest.mark.django_db
def test_case_study_links_are_web_only():
    p = make(live_url='javascript:alert(1)', github_url='https://github.com/u/x')
    p.save()
    assert p.case_study['liveUrl'] == ''
    assert p.case_study['githubUrl'] == 'https://github.com/u/x'


@pytest.mark.django_db
def test_case_study_payload_keys():
    p = make(tagline='T', problem='P', live_url='https://x.dev')
    p.save()
    data = p.case_study
    assert data['title'] == 'Portfolio' and data['tagline'] == 'T' and data['problem'] == 'P'
    assert data['liveUrl'] == 'https://x.dev'
    for key in ('category', 'description', 'techStack', 'features', 'architectureFlow',
                'architectureDetails', 'metrics', 'images', 'githubUrl'):
        assert key in data
