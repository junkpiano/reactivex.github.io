// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.provide('goog.testing.fs.FileWriterTest');
goog.setTestOnly('goog.testing.fs.FileWriterTest');

goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.fs.Error');
goog.require('goog.fs.FileSaver');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.fs.Blob');
goog.require('goog.testing.fs.FileSystem');
goog.require('goog.testing.jsunit');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var file, deferredWriter, mockClock;

function setUp() {
  mockClock = new goog.testing.MockClock(true);

  var fs = new goog.testing.fs.FileSystem();
  var fileEntry = fs.getRoot().createDirectorySync('foo').createFileSync('bar');

  deferredWriter = fileEntry.createWriter();
  file = fileEntry.fileSync();
  file.setDataInternal('');
}

function tearDown() {
  mockClock.uninstall();
}

function testWrite() {
  deferredWriter.
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.INIT)).
      addCallback(goog.partial(checkPositionAndLength, 0, 0)).
      addCallback(goog.partial(checkLastModified, 0)).
      addCallback(goog.partial(tick, 3)).
      addCallback(goog.partial(writeString, 'hello')).
      addCallback(goog.partial(checkPositionAndLength, 0, 0)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(checkLastModified, 0)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_START)).
      addCallback(goog.partial(checkLastModified, 0)).
      addCallback(goog.partial(checkPositionAndLength, 0, 0)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE)).
      addCallback(function() { assertEquals('hello', file.toString()); }).
      addCallback(goog.partial(checkPositionAndLength, 5, 5)).
      addCallback(goog.partial(checkLastModified, 3)).
      addCallback(tick).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(checkLastModified, 3)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_END)).
      addCallback(goog.partial(checkLastModified, 3)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.DONE)).
      addCallback(goog.partial(checkLastModified, 3)).
      addCallback(goog.partial(writeString, ' world')).
      addCallback(goog.partial(checkPositionAndLength, 5, 5)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE)).
      addCallback(function() { assertEquals('hello world', file.toString()); }).
      addCallback(goog.partial(checkPositionAndLength, 11, 11)).
      addCallback(goog.partial(checkLastModified, 4)).
      addBoth(continueTesting);
  waitForAsync('testWrite');
}

function testSeek() {
  deferredWriter.
      addCallback(goog.partial(tick, 17)).
      addCallback(goog.partial(writeAndWait, 'hello world')).
      addCallback(tick).
      addCallback(goog.partial(checkPositionAndLength, 11, 11)).

      addCallback(function(writer) { writer.seek(6); }).
      addCallback(goog.partial(checkPositionAndLength, 6, 11)).
      addCallback(goog.partial(checkLastModified, 17)).
      addCallback(goog.partial(writeAndWait, 'universe')).
      addCallback(tick).
      addCallback(function() {
        assertEquals('hello universe', file.toString());
      }).
      addCallback(goog.partial(checkPositionAndLength, 14, 14)).

      addCallback(function(writer) { writer.seek(500); }).
      addCallback(goog.partial(checkPositionAndLength, 14, 14)).
      addCallback(goog.partial(writeAndWait, '!')).
      addCallback(tick).
      addCallback(function() {
        assertEquals('hello universe!', file.toString());
      }).
      addCallback(goog.partial(checkPositionAndLength, 15, 15)).

      addCallback(function(writer) { writer.seek(-9); }).
      addCallback(goog.partial(checkPositionAndLength, 6, 15)).
      addCallback(goog.partial(writeAndWait, 'foo')).
      addCallback(tick).
      addCallback(function() {
        assertEquals('hello fooverse!', file.toString());
      }).
      addCallback(goog.partial(checkPositionAndLength, 9, 15)).

      addCallback(function(writer) { writer.seek(-500); }).
      addCallback(goog.partial(checkPositionAndLength, 0, 15)).
      addCallback(goog.partial(writeAndWait, 'bye-o')).
      addCallback(tick).
      addCallback(function() {
        assertEquals('bye-o fooverse!', file.toString());
      }).
      addCallback(goog.partial(checkPositionAndLength, 5, 15)).
      addCallback(goog.partial(checkLastModified, 21)).
      addBoth(continueTesting);
  waitForAsync('testSeek');
}

function testAbort() {
  deferredWriter.
      addCallback(goog.partial(tick, 13)).
      addCallback(goog.partial(writeString, 'hello world')).
      addCallback(function(writer) { writer.abort(); }).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(waitForError, goog.fs.Error.ErrorCode.ABORT)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.ABORT)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_END)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.DONE)).
      addCallback(goog.partial(checkPositionAndLength, 0, 0)).
      addCallback(goog.partial(checkLastModified, 0)).
      addCallback(function() { assertEquals('', file.toString()); }).
      addBoth(continueTesting);
  waitForAsync('testAbort');
}

function testTruncate() {
  deferredWriter.
      addCallback(goog.partial(writeAndWait, 'hello world')).
      addCallback(goog.partial(checkPositionAndLength, 11, 11)).
      addCallback(function(writer) { writer.truncate(5); }).
      addCallback(goog.partial(checkPositionAndLength, 11, 11)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_START)).
      addCallback(goog.partial(tick, 7)).
      addCallback(goog.partial(checkPositionAndLength, 11, 11)).
      addCallback(goog.partial(checkLastModified, 0)).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE)).
      addCallback(goog.partial(checkLastModified, 7)).
      addCallback(tick).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.WRITING)).
      addCallback(goog.partial(checkPositionAndLength, 5, 5)).
      addCallback(function() { assertEquals('hello', file.toString()); }).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_END)).
      addCallback(goog.partial(checkReadyState,
                               goog.fs.FileSaver.ReadyState.DONE)).

      addCallback(function(writer) { writer.truncate(10); }).
      addCallback(goog.partial(waitForEvent,
                               goog.fs.FileSaver.EventType.WRITE_END)).
      addCallback(goog.partial(checkPositionAndLength, 5, 10)).
      addCallback(goog.partial(checkLastModified, 8)).
      addCallback(function() {
        assertEquals('hello\0\0\0\0\0', file.toString());
      }).
      addBoth(continueTesting);
  waitForAsync('testTruncate');
}

function testAbortBeforeWrite() {
  deferredWriter.
      addCallback(function(writer) { writer.abort(); }).
      addErrback(function(err) {
        assertEquals(goog.fs.Error.ErrorCode.INVALID_STATE, err.code);
        return true;
      }).
      addCallback(function(calledErrback) {
        assertTrue(calledErrback);
      }).
      addBoth(continueTesting);
  waitForAsync('testAbortBeforeWrite');
}

function testAbortAfterWrite() {
  deferredWriter.
      addCallback(goog.partial(writeAndWait, 'hello world')).
      addCallback(function(writer) { writer.abort(); }).
      addErrback(function(err) {
        assertEquals(goog.fs.Error.ErrorCode.INVALID_STATE, err.code);
        return true;
      }).
      addCallback(assertTrue).
      addBoth(continueTesting);
  waitForAsync('testAbortAfterWrite');
}

function testWriteDuringWrite() {
  deferredWriter.
      addCallback(goog.partial(writeString, 'hello world')).
      addCallback(goog.partial(writeString, 'hello world')).
      addErrback(function(err) {
        assertEquals(goog.fs.Error.ErrorCode.INVALID_STATE, err.code);
        return true;
      }).
      addCallback(assertTrue).
      addBoth(continueTesting);
  waitForAsync('testWriteDuringWrite');
}

function testSeekDuringWrite() {
  deferredWriter.
      addCallback(goog.partial(writeString, 'hello world')).
      addCallback(function(writer) { writer.seek(5); }).
      addErrback(function(err) {
        assertEquals(goog.fs.Error.ErrorCode.INVALID_STATE, err.code);
        return true;
      }).
      addCallback(assertTrue).
      addBoth(continueTesting);
  waitForAsync('testSeekDuringWrite');
}

function testTruncateDuringWrite() {
  deferredWriter.
      addCallback(goog.partial(writeString, 'hello world')).
      addCallback(function(writer) { writer.truncate(5); }).
      addErrback(function(err) {
        assertEquals(goog.fs.Error.ErrorCode.INVALID_STATE, err.code);
        return true;
      }).
      addCallback(assertTrue).
      addBoth(continueTesting);
  waitForAsync('testTruncateDuringWrite');
}


function tick(opt_tickCount) {
  mockClock.tick(opt_tickCount);
}

function continueTesting(result) {
  asyncTestCase.continueTesting();
  if (result instanceof Error) {
    throw result;
  }
  mockClock.tick();
}

function waitForAsync(msg) {
  asyncTestCase.waitForAsync(msg);

  // The mock clock must be advanced far enough that all timeouts added during
  // callbacks will be triggered. 1000ms is much more than enough.
  mockClock.tick(1000);
}

function waitForEvent(type, target) {
  var d = new goog.async.Deferred();
  goog.events.listenOnce(target, type, goog.bind(d.callback, d, target));
  return d;
}

function waitForError(type, target) {
  var d = new goog.async.Deferred();
  goog.events.listenOnce(
      target, goog.fs.FileSaver.EventType.ERROR, function(e) {
        assertEquals(type, target.getError().code);
        d.callback(target);
      });
  return d;
}

function checkReadyState(expectedState, writer) {
  assertEquals(expectedState, writer.getReadyState());
}

function checkPositionAndLength(expectedPosition, expectedLength, writer) {
  assertEquals(expectedPosition, writer.getPosition());
  assertEquals(expectedLength, writer.getLength());
}

function checkLastModified(expectedTime) {
  assertEquals(expectedTime, file.lastModifiedDate.getTime());
}

function writeString(str, writer) {
  writer.write(new goog.testing.fs.Blob(str));
}

function writeAndWait(str, writer) {
  writeString(str, writer);
  return waitForEvent(goog.fs.FileSaver.EventType.WRITE_END, writer);
}
