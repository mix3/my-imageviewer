#!/usr/bin/env perl

use strict;
use warnings;
use utf8;

use Path::Class;
use File::Basename;
use Data::Section::Simple;
use Image::Magick::Thumbnail::Simple;
use Getopt::Long qw(:config posix_default no_ignore_case gnu_compat);
use Text::Xslate;
use Encode;
use Data::Dumper;
use JSON::XS;
use Image::Size;

my $force;

GetOptions(
	'force|f' => \$force,
);

use constant CONFIG => {
	PATH => {
		SCRIPT    => dir(dirname(__FILE__))->absolute->resolve,
		ROOT      => dir(dirname(__FILE__), '/..')->absolute->resolve,
		RESOURCE  => dir(dirname(__FILE__), '/../resource')->absolute->resolve,
		THUMBNAIL => dir(dirname(__FILE__), '/../thumbnail')->absolute->resolve,
		SLIDE     => dir(dirname(__FILE__), '/../slide')->absolute->resolve,
	},
	THUMBNAIL_NUM => 5,
};

my $hash = {};
my $im = Image::Magick->new();
my $t = Image::Magick::Thumbnail::Simple->new();
my $tx = Text::Xslate->new(
	cache => 0,
	path => [
		Data::Section::Simple->new()->get_data_section(),
	],
);

my $id = 1;
for my $object (CONFIG()->{PATH}->{RESOURCE}->children) {
	next unless (ref($object) eq 'Path::Class::Dir');

	my $resource_dir  = dir(CONFIG()->{PATH}->{RESOURCE},  '/', basename($object));
	my $thumbnail_dir = dir(CONFIG()->{PATH}->{THUMBNAIL}, '/', basename($object));
	$thumbnail_dir->mkpath;

	$hash->{$id} = { title => decode_utf8(basename($object)) };

	print encode_utf8($hash->{$id}->{title}), "\n";

	my $i = 0;
	my @image = $object->children;
	for my $image (sort { $a->{file} cmp $b->{file} } @image) {
		my $resource_path  = file($resource_dir,  '/', basename($image));
		my $thumbnail_path = file($thumbnail_dir, '/', basename($image));
		if ($i++ < CONFIG()->{THUMBNAIL_NUM}) {
			if ($force || ! -f $thumbnail_path) {
				$t->thumbnail(
					input  => $resource_path,
					output => $thumbnail_path,
					size   => 128,
				) or warn $t->error;
			}
			(my $fix_path = $thumbnail_path) =~ s/@{[CONFIG()->{PATH}->{ROOT}]}//g;
			push @{$hash->{$id}->{thumbnail}}, decode_utf8($fix_path);
		}
		my ($w, $h) = imgsize(file($resource_path)->stringify);
		(my $fix_path = $resource_path) =~ s/@{[CONFIG()->{PATH}->{ROOT}]}//g;
		push @{$hash->{$id}->{image}}, { p => decode_utf8($fix_path), w => $w || 0, h => $h || 0};
	}

	$id++;
}

for my $id (keys %$hash) {
	eval {
		my $writer = file(CONFIG()->{PATH}->{SLIDE}, '/', $hash->{$id}->{title}.'.html')->openw;
		$writer->print(encode_utf8($tx->render('slide.tx', { image => $hash->{$id}->{image}, json => encode_json $hash->{$id}->{image} })));
		$writer->close;
	};
	warn "$@, $!" if($@);
}

eval {
	my $writer = file(CONFIG()->{PATH}->{ROOT}, '/index.html')->openw;
	$writer->print(encode_utf8($tx->render('index.tx', { hash => $hash })));
	$writer->close;
};
warn "$@, $!" if($@);

__DATA__
@@ layout.tx

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>index</title>
    <link rel="stylesheet" href="/css/common.css">
    <script src="/js/jquery.js"></script>
    <script src="/js/jquery.presentation.js"></script>
    <script>
      var image = <: $json | mark_raw :>;
    </script>
    <script>
      $(document).ready(function(){
        $.presentation.hook._init();
        $.presentation.hook.page($.presentation.slideManager._current, 1);
      });
      $(window).resize(function(){
        $.presentation.hook._init();
        console.log($.presentation.hook);
        console.log($('div.onView img').width());
        console.log($('div.onView img').height());
      });
    </script>
  </head>
  <body>

  : block content ->{
    <div class="mod-page plain">
      <div>
        <img class="sideImgR" src="/path/to/file" alt="" width="400" height="400" />
      </div>
    </div>
  : }

  <hr />

: if (0) {
  <ul class="mod-pager" id="pager">
    <li id="pager-L"><a href="#">L</a></li>
    <li id="pager-R"><a href="#">R</a></li>
  </ul>

  <p class="mod-pageNum" id="pageNum">
    <span class="current" id="pageNum-current">0</span> / <span class="total" id="pageNum-total">0</span>
  </p>
: }

  </body>
</html>

@@ slide.tx
: cascade layout
: around content -> {
  : for $image -> $i {
  <div class="mod-page plain">
    <div>
    : if ($~i == 0) {
      <img src="<: $i.p :>" />
    : }
    </div>
  </div>
  : }
: }

@@ index.tx
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>index</title>
  </head>
  <body>
  : for $hash.keys() -> $key {
    <a href="/slide/<: $hash[$key].title :>.html"><: $hash[$key].title :><br />
    <table><tr><: for $hash[$key].thumbnail -> $t { :><td><img src="<: $t :>" width="128" /></td><: } :></tr></table>
  : }
  </body>
</html>
