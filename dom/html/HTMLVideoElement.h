/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_HTMLVideoElement_h
#define mozilla_dom_HTMLVideoElement_h

#include "mozilla/Attributes.h"
#include "mozilla/dom/HTMLMediaElement.h"

namespace mozilla {
namespace dom {

class WakeLock;
class VideoPlaybackQuality;

class HTMLVideoElement MOZ_FINAL : public HTMLMediaElement
{
public:
  typedef mozilla::dom::NodeInfo NodeInfo;

  explicit HTMLVideoElement(already_AddRefed<NodeInfo>& aNodeInfo);

  NS_IMPL_FROMCONTENT_HTML_WITH_TAG(HTMLVideoElement, video)

  using HTMLMediaElement::GetPaused;

  NS_IMETHOD_(bool) IsVideo() MOZ_OVERRIDE {
    return true;
  }

  virtual bool ParseAttribute(int32_t aNamespaceID,
                              nsIAtom* aAttribute,
                              const nsAString& aValue,
                              nsAttrValue& aResult) MOZ_OVERRIDE;
  NS_IMETHOD_(bool) IsAttributeMapped(const nsIAtom* aAttribute) const MOZ_OVERRIDE;

  static void Init();

  virtual nsMapRuleToAttributesFunc GetAttributeMappingFunction() const MOZ_OVERRIDE;

  virtual nsresult Clone(NodeInfo *aNodeInfo, nsINode **aResult) const MOZ_OVERRIDE;

  // Set size with the current video frame's height and width.
  // If there is no video frame, returns NS_ERROR_FAILURE.
  nsresult GetVideoSize(nsIntSize* size);

  virtual nsresult SetAcceptHeader(nsIHttpChannel* aChannel) MOZ_OVERRIDE;

  // Element
  virtual bool IsInteractiveHTMLContent() const MOZ_OVERRIDE;

  // WebIDL

  uint32_t Width() const
  {
    return GetIntAttr(nsGkAtoms::width, 0);
  }

  void SetWidth(uint32_t aValue, ErrorResult& aRv)
  {
    SetHTMLIntAttr(nsGkAtoms::width, aValue, aRv);
  }

  uint32_t Height() const
  {
    return GetIntAttr(nsGkAtoms::height, 0);
  }

  void SetHeight(uint32_t aValue, ErrorResult& aRv)
  {
    SetHTMLIntAttr(nsGkAtoms::height, aValue, aRv);
  }

  uint32_t VideoWidth() const
  {
    return mMediaSize.width == -1 ? 0 : mMediaSize.width;
  }

  uint32_t VideoHeight() const
  {
    return mMediaSize.height == -1 ? 0 : mMediaSize.height;
  }

  void GetPoster(nsAString& aValue)
  {
    GetURIAttr(nsGkAtoms::poster, nullptr, aValue);
  }
  void SetPoster(const nsAString& aValue, ErrorResult& aRv)
  {
    SetHTMLAttr(nsGkAtoms::poster, aValue, aRv);
  }

  uint32_t MozParsedFrames() const;

  uint32_t MozDecodedFrames() const;

  uint32_t MozPresentedFrames() const;

  uint32_t MozPaintedFrames();

  double MozFrameDelay();

  bool MozHasAudio() const;

  void NotifyOwnerDocumentActivityChanged() MOZ_OVERRIDE;

  already_AddRefed<VideoPlaybackQuality> GetVideoPlaybackQuality();

protected:
  virtual ~HTMLVideoElement();

  virtual JSObject* WrapNode(JSContext* aCx) MOZ_OVERRIDE;

  virtual void WakeLockCreate() MOZ_OVERRIDE;
  virtual void WakeLockRelease() MOZ_OVERRIDE;
  void UpdateScreenWakeLock();

  nsRefPtr<WakeLock> mScreenWakeLock;

private:
  static void MapAttributesIntoRule(const nsMappedAttributes* aAttributes,
                                    nsRuleData* aData);
};

} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_HTMLVideoElement_h
